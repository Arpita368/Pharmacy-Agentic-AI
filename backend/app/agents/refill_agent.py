from datetime import datetime, timedelta
from app.database.db import SessionLocal
from app.database.models import Order
from app.observability import tracer


def predict_refill():
    """
    Suggest refill reminders based on refill_date window.
    Reminder window:
    3 days before refill_date
    to
    3 days after refill_date
    """

    with tracer.start_as_current_span("Refill Prediction"):

        db = SessionLocal()

        try:
            today = datetime.now().date()

            orders = db.query(Order).filter(
                Order.refill_date != None
            ).all()

            suggestions = []

            for order in orders:
                refill_date = order.refill_date.date()

                reminder_start = refill_date - timedelta(days=3)
                reminder_end = refill_date + timedelta(days=3)

                # Only show within 7-day window
                if reminder_start <= today <= reminder_end:
                    suggestions.append({
                        "product": order.product_name,
                        "refill_date": refill_date.strftime("%Y-%m-%d"),
                        "message": f"You may need to refill {order.product_name} soon."
                    })

            return suggestions

        finally:
            db.close()
            
'''from collections import defaultdict
from app.database.db import SessionLocal
from app.database.models import Order
from app.observability import tracer


def predict_refill():
    ""
    Analyze purchase history to suggest medicine refills.
    ""

    with tracer.start_as_current_span("Refill Prediction"):

        db = SessionLocal()

        try:
            orders = db.query(Order).all()

            purchase_history = defaultdict(int)

            # aggregate quantities purchased
            for order in orders:
                purchase_history[order.product_name] += order.quantity

            suggestions = []

            for product, qty in purchase_history.items():
                # simple threshold logic
                if qty >= 2:
                    suggestions.append({
                        "product": product,
                        "total_purchased": qty,
                        "message": f"You may need to refill {product} soon."
                    })

            return suggestions

        finally:
            db.close()
'''