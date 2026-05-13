from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from db.database import get_db
from models import schemas
from services.auth import get_password_hash, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, get_current_user
from datetime import timedelta
import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/register", response_model=schemas.UserResponse)
async def register(user: schemas.UserCreate, db = Depends(get_db)):
    try:
        # Check if email exists
        existing_user = await db.users.find_one({"email": user.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
            
        user_dict = user.dict()
        # Add password hash
        user_dict["hashed_password"] = get_password_hash(user.password)
        # Remove raw password from dict to avoid saving it
        del user_dict["password"]
        
        user_dict["created_at"] = datetime.datetime.utcnow()
        
        result = await db.users.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during registration.")

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    try:
        user = await db.users.find_one({"email": form_data.username})
        if not user or not verify_password(form_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["_id"])}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer", "user_id": str(user["_id"]), "role": user.get("role", "candidate")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during login.")

@router.get("/me", response_model=schemas.UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserResponse)
async def update_me(user_update: dict, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        # Prevent changing email or role for security
        update_data = {k: v for k, v in user_update.items() if k not in ["email", "role", "_id", "hashed_password"]}
        
        if not update_data:
            return current_user
            
        from pymongo import ReturnDocument
        result = await db.users.find_one_and_update(
            {"_id": current_user["_id"]},
            {"$set": update_data},
            return_document=ReturnDocument.AFTER
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while updating the profile.")
