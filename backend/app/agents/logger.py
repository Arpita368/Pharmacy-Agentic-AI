from datetime import datetime
import os

# ensure logs folder exists
os.makedirs("logs", exist_ok=True)

LOG_FILE = "logs/system.log"


def log_event(event_type: str, message: str):
    """General system logging"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] [{event_type}] {message}\n"

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_line)


def log_procurement(medicine: str):
    """Log automated procurement events"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"[{timestamp}] [PROCUREMENT] Auto-ordered: {medicine}\n"

    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_line)

    print(f"🛒 Procurement logged for {medicine}")