# -----------------------------
# IMPORTS
# -----------------------------
import os
import io
import uuid
import json
import re
import shutil
from pathlib import Path
from datetime import datetime
from typing import List

import PIL
import PIL.Image
import whisper
from dotenv import load_dotenv
from requests import Session
from google import genai

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import desc, func, or_

from app.database.db import engine, SessionLocal
from app.database.models import Base, Product, Order, Cart

from app.agents.semantic_search import semantic_search
from app.agents.inventory_agent import analyze_inventory
from app.agents.refill_agent import predict_refill
from app.agents.alert_agent import check_low_stock
from app.agents.chat_storage import (
    create_conversation,
    save_message,
    get_conversations,
    get_messages
)
from app.agents.prescription_ai import extract_medicines_from_image
from app.agents.order_agent import create_order

from app.orchestrator import handle_query

from app.api.admin import router as admin_router
from app.api import webhook, refill
from app.api.order_routes import router as order_router

# -----------------------------
# INIT
# -----------------------------
load_dotenv()

app = FastAPI(title="AI Pharmacy Assistant API")
stt_model = whisper.load_model("base")

# -----------------------------
# ROUTERS
# -----------------------------
app.include_router(admin_router)
app.include_router(webhook.router)
app.include_router(refill.router)
app.include_router(order_router)

# -----------------------------
# STATIC FILES
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# DB INIT
# -----------------------------
Base.metadata.create_all(bind=engine)

# -----------------------------
# ROOT
# -----------------------------
@app.get("/")
def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")

# -----------------------------
# INVENTORY
# -----------------------------
@app.get("/inventory/analysis")
def inventory_analysis():
    return analyze_inventory()

@app.get("/admin/alerts")
def low_stock_alerts():
    return check_low_stock()

@app.get("/predict-refill")
def refill_predictions():
    return predict_refill()

# -----------------------------
# PRODUCTS
# -----------------------------
@app.get("/products")
def get_products():
    db = SessionLocal()
    try:
        products = db.query(Product).limit(52).all()
        return [
            {
                "id": p.id,
                "name": p.product_name,
                "stock": p.stock,
                "price": p.price_rec,
                "package_size": p.package_size
            }
            for p in products
        ]
    finally:
        db.close()

# -----------------------------
# SEARCH
# -----------------------------
@app.get("/search")
def search_products(query: str):
    db = SessionLocal()
    try:
        products = db.query(Product).filter(
            or_(
                Product.product_name.ilike(f"%{query}%"),
                Product.descriptions.ilike(f"%{query}%"),
                Product.package_size.ilike(f"%{query}%")
            )
        ).limit(10).all()

        return [
            {
                "id": p.id,
                "name": p.product_name,
                "price": p.price_rec,
                "package_size": p.package_size
            }
            for p in products
        ]
    finally:
        db.close()

# -----------------------------
# CHAT / AGENT
# -----------------------------
@app.get("/agent")
def agent(query: str, conversation_id: int, user_id: int = 1):
    save_message(conversation_id, user_id, "user", query)

    response = handle_query(query, conversation_id)

    if isinstance(response, dict):
        if response.get("ai_response"):
            bot_message = response["ai_response"]
        elif response.get("order"):
            bot_message = response["order"].get("message", "Order processed")
        else:
            bot_message = str(response)
    else:
        bot_message = response

    save_message(conversation_id, user_id, "bot", bot_message)
    return response

# -----------------------------
# CART
# -----------------------------
@app.get("/cart")
def get_cart():
    db = SessionLocal()
    items = db.query(Cart).all()
    db.close()
    return items

@app.delete("/cart/{item_id}")
def delete_cart_item(item_id: int):
    db = SessionLocal()
    item = db.query(Cart).filter(Cart.id == item_id).first()

    if item:
        db.delete(item)
        db.commit()

    db.close()
    return {"status": "deleted"}

# -----------------------------
# ORDERS
# -----------------------------
@app.get("/orders")
def get_orders():
    db = SessionLocal()
    try:
        orders = db.query(Order).order_by(desc(Order.created_at)).all()

        result = []
        for o in orders:
            result.append({
                "name": o.product_name,
                "price": o.total_price or 0,
                "dosage": o.dosage_frequency,
                "rx": o.prescription_required or False,
                "order_date": o.created_at.strftime("%Y-%m-%d %H:%M") if o.created_at else None,
                "status": o.status
            })

        return result
    finally:
        db.close()

# -----------------------------
# SCAN → SEARCH
# -----------------------------
@app.post("/scan/search-products")
def search_products_from_scan(medicines: list[str]):
    db = SessionLocal()

    try:
        results = []
        seen_ids = set()

        for med in medicines:
            search_results = semantic_search(med, top_k=1)

            if not search_results:
                continue

            top_match = search_results[0]

            if top_match.get("similarity_score", 0) < 0.45:
                continue

            product = db.query(Product).filter(
                Product.id == top_match["id"]
            ).first()

            if not product or product.id in seen_ids:
                continue

            seen_ids.add(product.id)

            results.append({
                "id": product.id,
                "name": product.product_name,
                "stock": product.stock,
                "price": product.price_rec,
                "rx": product.prescription_required,
                "similarity_score": top_match.get("similarity_score")
            })

        return {"products": results}

    finally:
        db.close()

# -----------------------------
# CHAT MANAGEMENT
# -----------------------------
@app.post("/chat/start")
def start_chat(user_id: int = 1):
    convo_id = create_conversation(user_id)
    return {"conversation_id": convo_id}

@app.get("/chat/conversations")
def list_conversations(user_id: int = 1):
    return get_conversations(user_id)

@app.get("/chat/messages")
def load_messages(conversation_id: int):
    return get_messages(conversation_id)

# -----------------------------
# ANALYTICS
# -----------------------------
@app.get("/api/analytics")
def get_analytics():
    db = SessionLocal()

    try:
        monthly_data = (
            db.query(
                func.strftime("%m", Order.created_at).label("month"),
                func.sum(Order.total_price).label("revenue")
            )
            .group_by("month")
            .all()
        )

        revenue_map = {int(m): float(r or 0) for m, r in monthly_data}
        revenues = [revenue_map.get(i, 0) for i in range(1, 13)]

        total_orders = db.query(Order).count()

        products = db.query(Product).all()

        inventory = [
            {
                "id": p.id,
                "name": p.product_name,
                "stock": p.stock,
                "price": p.price_rec
            }
            for p in products
        ]

        return {
            "revenues": revenues,
            "total_orders": total_orders,
            "inventory": inventory
        }

    finally:
        db.close()

# -----------------------------
# PRESCRIPTION SCAN
# -----------------------------
def extract_medicines_from_image(file_path):
    client = genai.Client()
    model_id = "gemini-2.5-flash"

    try:
        raw_image = PIL.Image.open(file_path)

        prompt = """
        Extract only the primary oral medications from the main prescription section.
        Exclude all IV fluids, injections, and clinical notes.
        Return ONLY JSON:
        [{"name": "Medicine Name", "dosage": "Instructions"}]
        """

        response = client.models.generate_content(
            model=model_id,
            contents=[prompt, raw_image]
        )

        json_match = re.search(r'\[.*\]', response.text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))

        return []

    except Exception as e:
        print(f"Extraction Error: {e}")
        return []

@app.post("/scan-prescription")
async def scan_prescription(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db = SessionLocal()

    try:
        extracted_medicines = extract_medicines_from_image(file_path)

        results = []

        for med in extracted_medicines:
            name = med.get("name")
            dosage = med.get("dosage", "As prescribed")

            product = db.query(Product).filter(
                Product.product_name.ilike(f"%{name}%")
            ).first()

            if product:
                quantity = 1
                total_price = float(product.price_rec or 0)

                new_order = Order(
                    product_id=product.id,
                    product_name=product.product_name,
                    quantity=quantity,
                    total_price=total_price,
                    dosage_frequency=dosage,
                    prescription_required=product.prescription_required,
                    created_at=datetime.utcnow()
                )

                db.add(new_order)
                db.commit()

                results.append({
                    "product": product.product_name,
                    "dosage": dosage,
                    "available": True,
                    "total_price": total_price
                })
            else:
                results.append({
                    "product": name,
                    "dosage": dosage,
                    "available": False
                })

        return {"status": "success", "orders": results}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

    finally:
        db.close()

# -----------------------------
# CHECKOUT FLOW
# -----------------------------
checkout_sessions = {}

@app.post("/checkout-prescription")
async def checkout_prescription(data: dict):
    conversation_id = data.get("conversation_id", 1)

    checkout_sessions[conversation_id] = {
        "medicines": data.get("medicines", [])
    }

    return {
        "status": "success",
        "message": "Address required"
    }

@app.post("/confirm-prescription-order")
async def confirm_prescription_order(data: dict):
    conversation_id = data.get("conversation_id", 1)
    address = data.get("address")

    session = checkout_sessions.get(conversation_id)

    if not session:
        return {"status": "error", "message": "Checkout expired"}

    results = []
    db = SessionLocal()

    try:
        for med in session["medicines"]:
            product = db.query(Product).filter(
                Product.product_name.ilike(f"%{med['name']}%")
            ).first()

            if not product:
                continue

            order = create_order(
                product_id=product.id,
                product_name=product.product_name,
                quantity=1,
                price=float(product.price_rec or 0),
                address=address
            )

            results.append(order)

        checkout_sessions.pop(conversation_id, None)

        return {
            "status": "success",
            "orders": results
        }

    finally:
        db.close()
