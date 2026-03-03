from app.database.db import SessionLocal
from app.database.models import Order, Product, Cart
from datetime import datetime, timedelta
from app.services.notification_service import send_whatsapp, send_email
from app.agents.restock_agent import auto_restock
import re


# ================================
# 🔹 DOSAGE PARSER
# ================================
def parse_daily_dose(dosage_text: str) -> int:
    if not dosage_text:
        return 1

    dosage_text = dosage_text.lower()

    if "once" in dosage_text:
        return 1
    elif "twice" in dosage_text:
        return 2
    elif "three" in dosage_text:
        return 3
    elif "four" in dosage_text:
        return 4
    else:
        return 1


# ================================
# 🔹 PACKAGE SIZE PARSER
# ================================
def extract_package_units(package_size: str) -> float:
    if not package_size:
        return 1

    if "x" in package_size.lower():
        parts = package_size.lower().split("x")
        try:
            first = float(re.search(r"\d+(\.\d+)?", parts[0]).group())
            second = float(re.search(r"\d+(\.\d+)?", parts[1]).group())
            return first * second
        except:
            pass

    match = re.search(r"\d+(\.\d+)?", package_size)
    return float(match.group()) if match else 1


# ================================
# 🛒 CREATE ORDER
# ================================
def create_order(
    product_id: int,
    product_name: str,
    quantity: int,
    price: float,
    address: str = None,
    phone: str = None
):

    db = SessionLocal()

    try:
        product = db.query(Product).filter(Product.id == product_id).first()

        if not product:
            return {"error": "Product not found"}

        if product.stock < quantity:
            return {"error": "Insufficient stock"}

        # ✅ Reduce stock
        product.stock -= quantity

        total_price = quantity * price

        # ================================
        # REFILL DATE CALCULATION
        # ================================
        dosage = product.dosage_frequency
        daily_dose = parse_daily_dose(dosage)

        package_units = extract_package_units(product.package_size)
        total_units = package_units * quantity

        days_supply = total_units / daily_dose
        refill_date = datetime.utcnow() + timedelta(days=days_supply)

        # =======================   =========
        # CREATE ORDER ENTRY
        # ================================
        new_order = Order(
            user_id=1,
            product_id=product_id,
            product_name=product_name,
            quantity=quantity,
            total_price=total_price,
            dosage_frequency=dosage,
            prescription_required=product.prescription_required,
            refill_date=refill_date,
            address=address,
            phone=phone,
            created_at=datetime.utcnow(),
            status="In process"
        )

        db.add(new_order)

        # ================================
        # ⭐ ADD ITEM TO CART (VERY IMPORTANT)
        # ================================
        cart_item = Cart(
            product_id=product_id,
            product_name=product_name,
            quantity=quantity,
            price=price
        )

        db.add(cart_item)

        db.commit()
        db.refresh(new_order)

        # ================================
        # AUTO RESTOCK CHECK
        # ================================
        auto_restock()

        # ================================
        # NOTIFICATIONS
        # ================================
        notify_phone = phone if phone else "+919999999999"
        message = f"Your order for {product_name} has been confirmed."

        send_whatsapp(notify_phone, message)
        send_email("customer@email.com", "Order Confirmed", message)

        # ================================
        # RESPONSE
        # ================================
        return {
            "message": "✅ Order placed successfully",
            "order_id": new_order.id,
            "product": product_name,
            "quantity": quantity,
            "delivery_address": address,
            "remaining_stock": product.stock,
            "total_price": total_price,
            "refill_date": refill_date.strftime("%Y-%m-%d")
        }

    finally:
        db.close()