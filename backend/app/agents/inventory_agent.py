from app.database.db import SessionLocal
from app.database.models import Product, Order
from sqlalchemy import func
from datetime import datetime, timedelta

LOW_STOCK_THRESHOLD = 10


def analyze_inventory():
    """
    Smart inventory analysis agent
    """

    db = SessionLocal()

    try:
        products = db.query(Product).all()
        report = []

        for p in products:

            # 🔻 Total orders in last 30 days
            recent_orders = db.query(func.sum(Order.quantity)).filter(
                Order.product_id == p.id,
                Order.created_at >= datetime.utcnow() - timedelta(days=30)
            ).scalar() or 0

            # 📊 Demand level
            if recent_orders > 50:
                demand = "HIGH"
            elif recent_orders > 20:
                demand = "MEDIUM"
            else:
                demand = "LOW"

            # ⚠ Low stock detection
            low_stock = p.stock <= LOW_STOCK_THRESHOLD

            # 📦 Reorder suggestion
            if demand == "HIGH":
                suggested_reorder = 100
            elif demand == "MEDIUM":
                suggested_reorder = 50
            else:
                suggested_reorder = 20

            # 🧊 Slow moving detection
            slow_moving = recent_orders == 0

            report.append({
                "product": p.product_name,
                "stock": p.stock,
                "demand": demand,
                "low_stock": low_stock,
                "suggested_reorder": suggested_reorder,
                "slow_moving": slow_moving
            })

        return report

    finally:
        db.close()