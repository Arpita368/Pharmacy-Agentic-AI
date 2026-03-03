from apscheduler.schedulers.background import BackgroundScheduler
from app.services.reminder_service import check_and_send_reminders
from app.services.refill_service import check_refill_alerts
scheduler = BackgroundScheduler()

def start_scheduler():
    scheduler.add_job(check_and_send_reminders, "interval", seconds=60)
    scheduler.add_job(check_refill_alerts, "interval", minutes=5)
    scheduler.start()

def start_scheduler():
    # runs every 60 seconds
    scheduler.add_job(check_and_send_reminders, "interval", seconds=60)
    scheduler.start()
    print("⏰ Reminder scheduler started...")


