from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import User
from app.auth.auth_handler import verify_password, create_token, hash_password

router = APIRouter(prefix="/auth", tags=["Authentication"])

# =====================================
# 🔐 LOGIN
# =====================================
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # login using email
    user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Wrong password")

    # ✅ include role inside token
    token = create_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {
        "access_token": token,
        "token_type": "bearer",
        "name": user.name,
        "email": user.email,
        "role": user.role      # ✅ IMPORTANT
    }


# =====================================
# 🆕 REGISTER NEW USER
# =====================================
@router.post("/register")
def register(
    name: str = Body(...),
    email: str = Body(...),
    password: str = Body(...),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == email).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role="user"   # default role
    )

    db.add(new_user)
    db.commit()

    return {
        "message": "User registered successfully"
    }