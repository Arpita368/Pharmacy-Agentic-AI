from app.database.db import SessionLocal
from app.database.models import Product
from app.observability import tracer
import re
from app.agents.semantic_search import semantic_search


# =========================================================
# 🚨 GLOBAL EMERGENCY CHECK (RUN BEFORE SEARCH / ORDER)
# =========================================================

EMERGENCY_KEYWORDS = [
    "poison",
    "overdose",
    "suicide",
    "kill myself",
    "too much medicine",
    "double dose",
    "toxic",
    "emergency",
    "side effects severe",
    "death",
    "die",
    "kill me"
]

def check_emergency(user_text: str):
    text = user_text.lower()

    for keyword in EMERGENCY_KEYWORDS:
        if keyword in text:
            return {
                "approved": False,
                "stage": "emergency",
                "message": "⚠ This appears to be a medical emergency. Please contact a doctor or emergency services immediately."
            }

    return {"approved": True}


# =========================================================
# 🔢 QUANTITY EXTRACTION
# =========================================================

def extract_quantity(text: str):
    match = re.search(r'(\d+)', text)
    if match:
        return int(match.group(1))
    return 1  # default quantity


# =========================================================
# 💊 DOSAGE EXTRACTION
# =========================================================

def extract_dosage(text: str):
    if not text:
        return []

    matches = re.findall(r'(\d+)\s?mg', text.lower())
    return matches


# =========================================================
# 🛡 ORDER VALIDATION PIPELINE
# =========================================================
def validate_order(product_keyword: str, quantity: int = None):

    with tracer.start_as_current_span("Safety Validation"):

        db = SessionLocal()

        try:
            # 1️⃣ Emergency check
            emergency_check = check_emergency(product_keyword)
            if not emergency_check.get("approved"):
                return emergency_check

            # 2️⃣ Extract quantity if missing
            if quantity is None:
                quantity = extract_quantity(product_keyword)

            # 3️⃣ Semantic Search (🔥 replaces ilike)
            results = semantic_search(product_keyword, top_k=1)

            if not results:
                return {
                    "approved": False,
                    "stage": "product_lookup",
                    "message": "Product not found"
                }

            top_result = results[0]

            product = db.query(Product).filter(
                Product.id == top_result["id"]
            ).first()

            if not product:
                return {
                    "approved": False,
                    "stage": "product_lookup",
                    "message": "Product not found"
                }

            # 4️⃣ Quantity validation
            if quantity <= 0:
                return {
                    "approved": False,
                    "stage": "quantity_validation",
                    "message": "Quantity must be greater than zero"
                }

            if quantity > 10:
                return {
                    "approved": False,
                    "stage": "quantity_limit",
                    "message": "Requested quantity exceeds safe purchase limit"
                }

            # 5️⃣ Stock validation
            if product.stock is not None and quantity > product.stock:
                return {
                    "approved": False,
                    "stage": "stock_check",
                    "message": f"Only {product.stock} units available in stock"
                }

            # 6️⃣ Dosage validation
            user_doses = extract_dosage(product_keyword)
            product_doses = extract_dosage(product.product_name)

            if user_doses and product_doses:
                if not any(dose in product_doses for dose in user_doses):
                    return {
                        "approved": False,
                        "stage": "dosage_mismatch",
                        "message": f"Requested dosage {user_doses} does not match available dosage {product_doses}"
                    }

            # 7️⃣ Prescription enforcement
            if getattr(product, "prescription_required", False):
                return {
                    "approved": False,
                    "stage": "prescription_required",
                    "message": "This medicine requires a valid prescription",
                    "requires_prescription": True,
                    "product_id": product.id,
                    "product_name": product.product_name
                }

            # 8️⃣ APPROVED
            return {
                "approved": True,
                "stage": "approved",
                "product_id": product.id,
                "product_name": product.product_name,
                "price": product.price_rec,
                "quantity": quantity,
                "remaining_stock": product.stock,
                "similarity_score": top_result["similarity_score"],
                "message": "Order validated successfully"
            }

        finally:
            db.close()
            
"""
def validate_order(product_keyword: str, quantity: int = None):
    ""
    Safety & policy enforcement for medicine ordering.
    ""

    with tracer.start_as_current_span("Safety Validation"):

        db = SessionLocal()

        try:
            # 🔍 emergency check first
            emergency_check = check_emergency(product_keyword)
            if not emergency_check.get("approved"):
                return emergency_check

            # 🔢 auto-extract quantity if not provided
            if quantity is None:
                quantity = extract_quantity(product_keyword)

            # 🔍 product lookup
            product = db.query(Product).filter(
                Product.product_name.ilike(f"%{product_keyword}%")
            ).first()

            if not product:
                return {
                    "approved": False,
                    "stage": "product_lookup",
                    "message": "Product not found"
                }

            # 🔢 quantity validation
            if quantity <= 0:
                return {
                    "approved": False,
                    "stage": "quantity_validation",
                    "message": "Quantity must be greater than zero"
                }

            if quantity > 10:
                return {
                    "approved": False,
                    "stage": "quantity_limit",
                    "message": "Requested quantity exceeds safe purchase limit"
                }

            # 📦 stock availability
            if product.stock is not None and quantity > product.stock:
                return {
                    "approved": False,
                    "stage": "stock_check",
                    "message": f"Only {product.stock} units available in stock"
                }

            # 💊 dosage validation (if user mentioned dosage)
            user_doses = extract_dosage(product_keyword)
            product_doses = extract_dosage(product.product_name)

            if user_doses and product_doses:
                if not any(dose in product_doses for dose in user_doses):
                    return {
                        "approved": False,
                        "stage": "dosage_mismatch",
                        "message": f"Requested dosage {user_doses} does not match available dosage {product_doses}"
                    }

            # 🧾 prescription enforcement
            if getattr(product, "prescription_required", False):
                return {
                    "approved": False,
                    "stage": "prescription_required",
                    "message": "This medicine requires a valid prescription",
                    "requires_prescription": True,
                    "product_id": product.id,
                    "product_name": product.product_name
                }

            # ✅ approved
            return {
                "approved": True,
                "stage": "approved",
                "product_id": product.id,
                "product_name": product.product_name,
                "price": product.price_rec,
                "quantity": quantity,
                "message": "Order validated successfully"
            }

        finally:
            db.close()
"""
"""
from app.database.db import SessionLocal
from app.database.models import Product
from app.observability import tracer


def validate_order(product_keyword: str, quantity: int = 1):
    #""
    #Safety & policy enforcement for medicine ordering.
    #""

    with tracer.start_as_current_span("Safety Validation"):

        db = SessionLocal()

        try:
            # 🔍 product lookup
            product = db.query(Product).filter(
                Product.product_name.ilike(f"%{product_keyword}%")
            ).first()

            if not product:
                return {
                    "approved": False,
                    "stage": "product_lookup",
                    "message": "Product not found"
                }

            # 🔢 quantity checks
            if quantity <= 0:
                return {
                    "approved": False,
                    "stage": "quantity_validation",
                    "message": "Quantity must be greater than zero"
                }

            if quantity > 10:
                return {
                    "approved": False,
                    "stage": "quantity_limit",
                    "message": "Requested quantity exceeds safe purchase limit"
                }

            # 📦 stock availability
            if product.stock is not None and quantity > product.stock:
                return {
                    "approved": False,
                    "stage": "stock_check",
                    "message": f"Only {product.stock} units available in stock"
                }

            # 🧾 prescription enforcement
            if getattr(product, "prescription_required", False):
                return {
                    "approved": False,
                    "stage": "prescription_required",
                    "message": "This medicine requires a valid prescription",
                    "requires_prescription": True,
                    "product_id": product.id,
                    "product_name": product.product_name
                }

            # ✅ approved order
            return {
                "approved": True,
                "stage": "approved",
                "product_id": product.id,
                "product_name": product.product_name,
                "price": product.price_rec,
                "quantity": quantity,
                "message": "Order validated successfully"
            }

        finally:
            db.close()
"""
