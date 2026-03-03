from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.agents.logger import log_procurement

router = APIRouter()


@router.post("/webhook/low-stock")
def low_stock_webhook(data: dict):
    """
    🚨 Receives low stock events
    Triggers automated procurement simulation
    """

    medicine = data.get("medicine")
    quantity = data.get("quantity")

    # ✅ validate payload
    if not medicine or quantity is None:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    print("\n==============================")
    print("⚠ LOW STOCK WEBHOOK RECEIVED")
    print(f"Medicine : {medicine}")
    print(f"Stock    : {quantity}")
    print(f"Time     : {datetime.now()}")
    print("==============================")

    # 🛒 simulate procurement
    print(f"🛒 Auto procurement started for {medicine}")
    print("📦 Supplier notified")

    # 📝 log event
    log_procurement(medicine)

    return {
        "status": "procurement_started",
        "medicine": medicine,
        "remaining_stock": quantity,
        "timestamp": str(datetime.now())
    }