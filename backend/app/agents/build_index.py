import os
import faiss
import numpy as np
import re
from sentence_transformers import SentenceTransformer

from app.database.db import SessionLocal
from app.database.models import Product


# ----------------------------
# Text Normalization
# ----------------------------
def clean_text(text):
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text.strip()


# ----------------------------
# Build FAISS Index
# ----------------------------
def build_faiss_index():

    print("🔄 Loading products...")

    db = SessionLocal()
    products = db.query(Product).all()
    db.close()

    if not products:
        print("❌ No products found.")
        return

    print(f"✅ Loaded {len(products)} products")

    # Load model (CPU safe)
    model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

    product_texts = []

    for p in products:
        text = f"""
        medicine drug treatment pharmaceutical healthcare
        product name {clean_text(p.product_name)}
        description {clean_text(p.descriptions)}
        package size {clean_text(p.package_size)}
        healthcare medicine treatment
        """
        product_texts.append(text)

    print("🔄 Generating embeddings...")

    embeddings = model.encode(
        product_texts,
        normalize_embeddings=True,
        convert_to_numpy=True
    )

    embeddings = np.array(embeddings).astype("float32")

    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)

    # Ensure directory exists
    os.makedirs("app/agents", exist_ok=True)

    faiss.write_index(
        index,
        "app/agents/product_index.faiss"
    )

    print("✅ FAISS medical index built successfully!")
    print("📦 File saved at: app/agents/product_index.faiss")


if __name__ == "__main__":
    build_faiss_index()