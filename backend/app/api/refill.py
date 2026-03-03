from fastapi import APIRouter
from app.agents.refill_agent import predict_refill

router = APIRouter()

@router.get("/refill-alerts")
def refill_alerts():
    """
    Returns predicted refill suggestions
    based on user purchase history.
    """
    return predict_refill()
