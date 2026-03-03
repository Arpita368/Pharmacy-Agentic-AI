from app.agents.ocr_agent import extract_medicine_lines
from app.agents.semantic_search import semantic_search
from app.database.db import SessionLocal
from app.database.models import Order


from datetime import datetime, timedelta
from app.database.models import Product, Order

def scan_and_create_orders(image_path: str):

    db = SessionLocal()

    try:
        lines = extract_medicine_lines(image_path)

        added_products = []

        for line in lines:

            results = semantic_search(line, top_k=1)

            if not results:
                continue

            match = results[0]

            # ⭐ Fetch full product record (IMPORTANT)
            product = db.query(Product).filter(
                Product.id == match["id"]
            ).first()

            if not product:
                continue

            # ⭐ Safety check stock
            if product.stock <= 0:
                continue

            # ⭐ Dosage parsing (fallback = 1)
            daily_dose = 1
            if product.dosage_frequency:
                if "twice" in product.dosage_frequency.lower():
                    daily_dose = 2
                elif "three" in product.dosage_frequency.lower():
                    daily_dose = 3

            quantity = 1

            # ⭐ Calculate price snapshot
            unit_price = float(product.price_rec or 0)
            total_price = unit_price * quantity

            # ⭐ Refill prediction (basic pharma logic)
            days_supply = max(1, quantity * 7)

            refill_date = datetime.utcnow() + timedelta(days=days_supply)

            # ⭐ Reduce inventory
            product.stock -= quantity

            # ⭐ Create order snapshot (VERY IMPORTANT)
            new_order = Order(
                product_id=product.id,
                product_name=product.product_name,
                quantity=quantity,
                total_price=total_price,
                dosage_frequency=product.dosage_frequency or "As prescribed",
                prescription_required=product.prescription_required,
                refill_date=refill_date,
                created_at=datetime.utcnow()
            )

            db.add(new_order)

            added_products.append(product.product_name)

        db.commit()

        return {
            "status": "success",
            "added": added_products,
            "detected_lines": lines
        }

    except Exception as e:
        db.rollback()
        return {
            "status": "error",
            "message": str(e)
        }

    finally:
        db.close()
        
'''def scan_and_create_orders(image_path: str):
    ""
    Full pipeline:
    Image → OCR → Semantic Search → Orders Table
    ""

    db = SessionLocal()

    try:
        lines = extract_medicine_lines(image_path)

        added_products = []

        for line in lines:

            results = semantic_search(line, top_k=1)

            if not results:
                continue

            product = results[0]

            new_order = Order(
                product_id=product["id"],
                quantity=1
            )

            db.add(new_order)
            added_products.append(product["product_name"])

        db.commit()

        return {
            "status": "success",
            "added": added_products,
            "detected_lines": lines
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

    finally:
        db.close()'''