from fastapi import APIRouter
from app.database.db import SessionLocal
from app.database.models import Cart, Order
from datetime import datetime
import uuid

router = APIRouter()

# =========================
# CHECKOUT CART
# =========================
@router.post("/orders/checkout")
def checkout_order(payload: dict):
    db = SessionLocal()

    try:
        cart_items = db.query(Cart).all()

        if not cart_items:
            return {"status": "error", "error": "Cart is empty"}

        total = sum(item.price * item.quantity for item in cart_items)

        invoice_id = str(uuid.uuid4())[:8].upper()

        # ✅ mark orders as confirmed
        for item in cart_items:
            order = Order(
                user_id=1,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                total_price=item.price * item.quantity,
                created_at=datetime.utcnow(),
                status="Confirmed"
            )
            db.add(order)

        # ✅ clear cart after checkout
        db.query(Cart).delete()

        db.commit()

        return {
            "status": "success",
            "invoice_id": invoice_id,
            "total_usd": round(total, 2),
            "total_inr": round(total * 83, 2)  # conversion for demo
        }

    finally:
        db.close()