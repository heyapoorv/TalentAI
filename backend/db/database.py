import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = "talentai"

class Database:
    client: AsyncIOMotorClient = None

db = Database()

async def get_db():
    return db.client[DB_NAME]
