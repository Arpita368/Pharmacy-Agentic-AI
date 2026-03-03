import pandas as pd
from app.database.db import SessionLocal
from app.database.models import Product

# Load Excel file
file_path = "app/database/medicine_master.xlsx"
df = pd.read_excel(file_path)

db = SessionLocal()

# Clear existing data (optional but recommended)
db.query(Product).delete()

for _, row in df.iterrows():
    product = Product(
        id=int(row["product id"]),
        product_name=row["product name"],
        pzn=str(row["pzn"]),
        price_rec=float(row["price rec"]),
        package_size=row["package size"],
        descriptions=row["descriptions"],
        stock=100,  # default stock
        prescription_required=False  # default
    )

    db.add(product)

db.commit()
db.close()

print("✅ Medicine master data loaded successfully!")
