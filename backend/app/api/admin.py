from fastapi import APIRouter
from app.database.db import SessionLocal
from app.database.models import Product

router = APIRouter()

@router.get("/admin/inventory")
def view_inventory():
    """
    Admin view of current inventory
    """
    db = SessionLocal()

    products = db.query(Product).all()

    result = []
    for p in products:
        result.append({
            "id": p.id,
            "product": p.product_name,
            "stock": p.stock,
            "price": p.price_rec,
            "prescription_required": p.prescription_required
        })

    db.close()
    return result
