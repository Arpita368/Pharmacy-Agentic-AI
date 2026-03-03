from app.database.db import SessionLocal
from app.database.models import Conversation, ChatMessage


def create_conversation(user_id: int):
    db = SessionLocal()
    try:
        convo = Conversation(user_id=user_id)
        db.add(convo)
        db.commit()
        db.refresh(convo)
        return convo.id
    finally:
        db.close()


def save_message(conversation_id: int, user_id: int, role: str, message: str):
    db = SessionLocal()
    try:
        msg = ChatMessage(
            conversation_id=conversation_id,
            user_id=user_id,
            role=role,
            message=message
        )
        db.add(msg)
        db.commit()
    finally:
        db.close()


def get_conversations(user_id: int):
    db = SessionLocal()
    try:
        convos = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.created_at.desc()).all()

        return [
            {
                "id": c.id,
                "created_at": c.created_at
            }
            for c in convos
        ]
    finally:
        db.close()


def get_messages(conversation_id: int):
    db = SessionLocal()
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).order_by(ChatMessage.timestamp).all()

        return [
            {
                "role": m.role,
                "message": m.message
            }
            for m in messages
        ]
    finally:
        db.close()