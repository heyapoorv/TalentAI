"""
scripts/migrate_intelligence.py

A background script to backfill `hiring_recommendation` and `ranking_explanation` 
on existing application documents.
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Add the project root to python path to import backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.recruiter_intelligence import generate_hiring_recommendation, explain_ranking

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "talentai")

async def run_migration():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Starting intelligence migration for existing applications...")
    
    apps = await db.applications.find({"hiring_recommendation": {"$exists": False}}).to_list(None)
    
    print(f"Found {len(apps)} applications to process.")
    
    for idx, app in enumerate(apps):
        app_id = str(app["_id"])
        print(f"[{idx+1}/{len(apps)}] Processing application {app_id}...")
        
        try:
            # Generate Hiring Recommendation
            await generate_hiring_recommendation(app_id, db)
            
            # Generate Ranking Explanation
            await explain_ranking(app_id, db)
            
            print(f"  -> Success.")
        except Exception as e:
            print(f"  -> Failed: {e}")
            
        # Sleep slightly to avoid aggressive rate limits
        await asyncio.sleep(2)
        
    print("Migration completed.")
    client.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
