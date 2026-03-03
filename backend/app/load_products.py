import pandas as pd
from app.database.db import SessionLocal, engine
from app.database.models import Base, Product

Base.metadata.create_all(bind=engine)


def load_products():
    df = pd.read_excel("data/products-export.xlsx")

    df.columns = df.columns.str.strip().str.lower()

    db = SessionLocal()

    inserted_count = 0

    for _, row in df.iterrows():

        
        if pd.isna(row.get("product name")):
            continue

    
        existing_product = db.query(Product).filter_by(
            pzn=row.get("pzn")
        ).first()

        if existing_product:
            continue

        product = Product(
            product_name=str(row.get("product name")),
            pzn=str(row.get("pzn")) if not pd.isna(row.get("pzn")) else None,
            price_rec=float(row.get("price rec")) if not pd.isna(row.get("price rec")) else None,
            package_size=str(row.get("package size")) if not pd.isna(row.get("package size")) else None,
            descriptions=str(row.get("descriptions")) if not pd.isna(row.get("descriptions")) else None,
        )

        db.add(product)
        inserted_count += 1

    db.commit()
    db.close()

    print(f"✅ {inserted_count} products inserted successfully!")


if __name__ == "__main__":
    load_products()
