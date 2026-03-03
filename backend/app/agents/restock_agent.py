from app.database.db import SessionLocal
from app.database.models import Product
from app.services.notification_service import send_whatsapp
from app.observability import tracer


LOW_STOCK_THRESHOLD = 20
RESTOCK_LEVEL = 100   # desired stock after restock


def auto_restock():
    """
    🔄 Automatically restock low inventory medicines
    """

    with tracer.start_as_current_span("Auto Restock Agent"):

        db = SessionLocal()
        restocked_items = []

        try:
            low_stock_products = db.query(Product).filter(
                Product.stock <= LOW_STOCK_THRESHOLD
            ).all()

            for product in low_stock_products:

                reorder_qty = RESTOCK_LEVEL - product.stock

                if reorder_qty <= 0:
                    continue

                # simulate supplier restock
                product.stock += reorder_qty

                restocked_items.append({
                    "product": product.product_name,
                    "restocked_quantity": reorder_qty,
                    "new_stock": product.stock
                })

                # notify admin (WhatsApp mock)
                send_whatsapp(
                    "+919999999999",
                    f"Restocked {product.product_name} (+{reorder_qty}). New stock: {product.stock}"
                )

            db.commit()

            return restocked_items

        finally:
            db.close()