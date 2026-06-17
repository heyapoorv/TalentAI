import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient

# Make sure we can import from backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.auth import get_password_hash

async def seed_admin(email: str):
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client["talentai"]

    user = await db.users.find_one({"email": email})
    
    if user:
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"role": "admin", "is_active": True}})
        print(f"Updated existing user {email} to admin role.")
    else:
        password = "AdminPassword123!"
        hashed = get_password_hash(password)
        await db.users.insert_one({
            "name": "Platform Admin",
            "email": email,
            "role": "admin",
            "hashed_password": hashed,
            "is_active": True
        })
        print(f"Created new admin user {email} with password: {password}")

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "admin@talentai.com"
    asyncio.run(seed_admin(email))
