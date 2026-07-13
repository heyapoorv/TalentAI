from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId
from db.database import get_db
import hashlib
import os

# ==============================
# CONFIG
# ==============================
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "a_very_secret_key_for_talentai")
ALGORITHM = "HS256"

ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ==============================
# PASSWORD HANDLING
# ==============================

def get_password_hash(password: str) -> str:
    sha256_hash = hashlib.sha256(password.encode()).hexdigest()
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(sha256_hash.encode(), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    try:
        return bcrypt.checkpw(sha256_hash.encode(), hashed_password.encode('utf-8'))
    except Exception:
        # Fallback for legacy passwords hashed without SHA-256 pre-processing
        try:
            return bcrypt.checkpw(plain_password[:72].encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False


# ==============================
# TOKEN CREATION
# ==============================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode.update({
        "exp": expire,
        "type": "access"
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode.update({
        "exp": expire,
        "type": "refresh"
    })

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ==============================
# AUTH DEPENDENCY
# ==============================

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db=Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")

        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise credentials_exception

    if user is None:
        raise credentials_exception

    return user


# ==============================
# ROLE-BASED ACCESS
# ==============================

def require_role(required_roles: List[str]):
    async def role_checker(user=Depends(get_current_user)):
        if user.get("role") not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        return user
    return role_checker


def candidate_only(user=Depends(get_current_user)):
    if user.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Candidates only")
    return user


def recruiter_only(user=Depends(get_current_user)):
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiters only")
    return user

def admin_only(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

