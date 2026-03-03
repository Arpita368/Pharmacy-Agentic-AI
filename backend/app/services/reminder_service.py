from datetime import datetime
from app.database.db import SessionLocal
from app.database.models import Reminder
from app.services.whatsapp_service import send_whatsapp_message


def check_and_send_reminders():
    """
    Check reminder schedule and send WhatsApp alerts.
    """

    db = SessionLocal()

    try:
        current_time = datetime.now().strftime("%H:%M")

        reminders = db.query(Reminder).filter(
            Reminder.reminder_time == current_time,
            Reminder.active == True
        ).all()

        for r in reminders:

            message = f"""
💊 Medicine Reminder

Take: {r.medicine_name}
Dosage: {r.dosage}

Stay healthy 💙
"""

            if send_whatsapp_message(r.user_phone, message):
                print(f"📲 Reminder sent to {r.user_phone}")
            else:
                print(f"❌ Reminder failed for {r.user_phone}")

    finally:
        db.close()