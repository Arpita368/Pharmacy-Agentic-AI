import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from app.database.db import SessionLocal
from app.database.models import Product
from app.observability import tracer
import re

# load model once
model = SentenceTransformer("all-MiniLM-L6-v2",device="cpu")

# load FAISS index once
index = faiss.read_index("app/agents/product_index.faiss")

def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text.strip()


def semantic_search(query: str, top_k: int = 1):

    with tracer.start_as_current_span("Semantic Retrieval"):

        if not query or not query.strip():
            return []

        db = SessionLocal()

        try:
            products = db.query(Product).all()

            if not products:
                return []

            # Clean query ⭐
            query = clean_text(query)

            # Encode query
            query_vector = model.encode(
                [query],
                normalize_embeddings=True,
                convert_to_numpy=True
            ).astype("float32")

            distances, indices = index.search(query_vector, top_k)

            results = []

            SIMILARITY_THRESHOLD = 0.55   # ⭐ CRITICAL FOR MEDICAL SEARCH

            for score, idx in zip(distances[0], indices[0]):

                if score < SIMILARITY_THRESHOLD:
                    continue

                if 0 <= idx < len(products):

                    product = products[idx]

                    results.append({
                        "id": product.id,
                        "product_name": product.product_name,
                        "price_rec": product.price_rec,
                        "package_size": product.package_size,
                        "similarity_score": float(score)
                    })

            return results

        finally:
            db.close()

"""def semantic_search(query: str, top_k: int = 5):
    #""
    #Perform semantic search on product catalog.
    #""

    with tracer.start_as_current_span("Semantic Retrieval"):

        if not query.strip():
            return []

        db = SessionLocal()

        try:
            products = db.query(Product).all()

            # encode query
            query_vector = model.encode([query])

            distances, indices = index.search(
                np.array(query_vector).astype("float32"),
                top_k
            )

            results = []

            for i, idx in enumerate(indices[0]):
                if 0 <= idx < len(products):
                    product = products[idx]

                    results.append({
                        "id": product.id,
                        "product_name": product.product_name,
                        "price_rec": product.price_rec,
                        "package_size": product.package_size,
                        "similarity_score": float(distances[0][i])
                    })

            return results

        finally:
            db.close()
"""