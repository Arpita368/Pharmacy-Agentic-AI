from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from datetime import datetime
from app.database.db import Base


# =========================
# CONVERSATION MEMORY
# =========================

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    user_id = Column(Integer, nullable=False)
    role = Column(String(20))  # user | bot
    message = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


# =========================
# PRODUCT TABLE
# =========================

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    product_name = Column(String, nullable=False, index=True)
    pzn = Column(String)
    price_rec = Column(Float)
    package_size = Column(String)
    descriptions = Column(String)

    # inventory & safety
    stock = Column(Integer, default=100)
    prescription_required = Column(Boolean, default=False)

    dosage_frequency = Column(String)


# =========================
# USER TABLE
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)


# =========================
# ORDER TABLE
# =========================

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    # optional user link
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # product link
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name = Column(String)

    quantity = Column(Integer)
    total_price = Column(Float)

    # medicine details
    dosage_frequency = Column(String)
    prescription_required = Column(Boolean)

    # delivery details ⭐
    phone = Column(String)
    address = Column(String)

    # refill & analytics
    refill_date = Column(DateTime)

    # timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # order tracking
    status = Column(String, default="In process")


# =========================
# CART TABLE
# =========================

class Cart(Base):
    __tablename__ = "cart"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    product_name = Column(String)
    quantity = Column(Integer)
    price = Column(Float)


# =========================
# PRESCRIPTION SCAN RESULTS
# =========================

class ScanResult(Base):
    __tablename__ = "scan_results"

    id = Column(Integer, primary_key=True, index=True)

    filename = Column(String)
    extracted_text = Column(String)
    identified_medicine = Column(String)
    status = Column(String)  # SUCCESS / FAILED

    created_at = Column(DateTime, default=datetime.utcnow)