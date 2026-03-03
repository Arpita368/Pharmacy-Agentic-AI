from datetime import datetime
import requests

from app.database.db import SessionLocal
from app.database.models import Product
from app.services.whatsapp_service import send_whatsapp_message


LOW_STOCK_THRESHOLD = 10

# prevents duplicate alerts in same runtime
_triggered_products = set()

# 📱 numbers (NO whatsapp: prefix)
ADMIN_PHONE = "+91999999999"      # replace
SUPPLIER_PHONE = "+9191999999999"   # replace


def trigger_low_stock_webhook(medicine, stock):
    """Send webhook event when stock is low"""
    try:
        requests.post(
            "http://127.0.0.1:8000/webhook/low-stock",
            json={"medicine": medicine, "quantity": stock},
            timeout=3
        )
        print(f"✅ Webhook triggered for {medicine}")
    except Exception as e:
        print("❌ Webhook error:", e)


def send_whatsapp_alert(product_name, stock):
    """Send WhatsApp alerts to admin & supplier"""

    timestamp = datetime.now().strftime("%H:%M")

    admin_message = f"""
⚠ PharmaAI Low Stock Alert

Medicine: {product_name}
Stock Remaining: {stock}
Time: {timestamp}

Please restock immediately.
"""

    supplier_message = f"""
📦 Procurement Notice

Medicine: {product_name}
Stock Remaining: {stock}

Prepare new shipment.
Time: {timestamp}
"""

    # 📲 Admin alert
    if send_whatsapp_message(ADMIN_PHONE, admin_message):
        print(f"📲 Admin alert sent for {product_name}")
    else:
        print(f"❌ Admin alert failed for {product_name}")

    # 📲 Supplier alert
    if send_whatsapp_message(SUPPLIER_PHONE, supplier_message):
        print(f"📦 Supplier notified for {product_name}")
    else:
        print(f"❌ Supplier alert failed for {product_name}")


def check_low_stock():
    """
    Detect low stock items
    Trigger webhook + WhatsApp alert
    Return alerts for dashboard/API
    """

    db = SessionLocal()

    try:
        products = db.query(Product).all()
        alerts = []

        for p in products:

            # 🔹 Low stock condition
            if p.stock is not None and p.stock <= LOW_STOCK_THRESHOLD:

                alerts.append({
                    "product": p.product_name,
                    "stock": p.stock,
                    "alert": "⚠ Low stock — reorder soon"
                })

                # 🚀 trigger only once per runtime
                if p.product_name not in _triggered_products:
                    trigger_low_stock_webhook(p.product_name, p.stock)
                    send_whatsapp_alert(p.product_name, p.stock)
                    _triggered_products.add(p.product_name)

            # 🔹 reset alert if stock restored
            elif p.stock is not None and p.stock > LOW_STOCK_THRESHOLD:
                if p.product_name in _triggered_products:
                    _triggered_products.remove(p.product_name)

        return alerts

    finally:

        db.close()
