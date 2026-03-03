from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class PaymentRequest(BaseModel):
    order_id: int
    payment_method: str  # COD or UPI


@router.post("/pay")
def process_payment(data: PaymentRequest):

    if data.payment_method.upper() == "COD":
        return {
            "status": "success",
            "message": "Order placed with Cash on Delivery"
        }

    elif data.payment_method.upper() == "UPI":
        return {
            "status": "success",
            "message": "UPI payment successful",
            "transaction_id": "UPI123456789"
        }

    return {"status": "failed", "message": "Invalid payment method"}