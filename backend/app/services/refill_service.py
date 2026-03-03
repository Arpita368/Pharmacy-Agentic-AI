from app.database.db import SessionLocal
from app.database.models import Reminder
from app.services.whatsapp_service import send_whatsapp_message


def check_refill_alerts():

    db = SessionLocal()

    try:
        reminders = db.query(Reminder).filter(Reminder.active == True).all()

        for r in reminders:

            if r.daily_usage > 0:
                days_left = r.quantity_left // r.daily_usage

                if days_left <= 2 and r.quantity_left > 0:

                    message = f"""
💊 Refill Reminder

Your {r.medicine_name} will finish in {days_left} day(s).

Please refill soon.
"""

                    send_whatsapp_message(r.user_phone, message)
                    print(f"📲 Refill alert sent to {r.user_phone}")

    finally:
        db.close()