import pandas as pd
from app.database.db import SessionLocal
from app.database.models import Order, Product
from datetime import datetime, timedelta
# 📁 Excel file path
file_path = "app/database/consumer_history.xlsx"

# ✅ Read correct header row
df = pd.read_excel(file_path, header=4)

# 🔎 Clean column names (remove spaces issues)
df.columns = df.columns.str.strip()

db = SessionLocal()

loaded = 0
skipped = 0

for _, row in df.iterrows():
    try:
        product_name = str(row["Product Name"]).strip()
        quantity = int(row["Quantity"])

        # 🔍 find matching product in DB
        product = db.query(Product).filter(
            Product.product_name.ilike(f"%{product_name}%")
        ).first()

        if not product:
            skipped += 1
            continue

        order = Order(
            product_id=product.id,
            product_name=product.product_name,
            quantity=quantity,
            total_price=quantity * (product.price_rec or 0),
            user_id=1  # demo user
        )

        db.add(order)
        loaded += 1

    except Exception as e:
        skipped += 1
        print(f"⚠️ Skipped row due to error: {e}")

db.commit()
db.close()

print(f"✅ Consumer history loaded!")
print(f"✔ Orders added: {loaded}")
print(f"⚠ Skipped rows: {skipped}")
