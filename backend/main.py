from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from db.database import db, MONGO_URL, DB_NAME
from api.routes import router as main_router
from api.auth_routes import router as auth_router
import logging

logger = logging.getLogger(__name__)

from services.embedding import load_model

# ==============================
# LIFESPAN (DB INIT)
# ==============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db.client = AsyncIOMotorClient(MONGO_URL)
        db.database = db.client[DB_NAME]

        # ✅ Load embedding model here
        load_model()

        # ==============================
        # CREATE COLLECTIONS (if missing)
        # ==============================
        existing = await db.database.list_collection_names()
        required = ["users", "resumes", "jobs", "applications"]

        for col in required:
            if col not in existing:
                await db.database.create_collection(col)

        # ==============================
        # CREATE INDEXES (IMPORTANT 🚀)
        # ==============================
        await db.database.users.create_index("email", unique=True)
        await db.database.resumes.create_index("user_id")
        await db.database.jobs.create_index("recruiter_id")
        await db.database.applications.create_index(
            [("user_id", 1), ("job_id", 1)],
            unique=True  # prevent duplicate applications
        )
        await db.database.applications.create_index("job_id")
        await db.database.applications.create_index("match_score")

        logger.info("Indexes ensured")
    except Exception as e:
        logger.error(f"Startup error: {str(e)}")
        raise

    yield

    # ==============================
    # SHUTDOWN
    # ==============================
    try:
        db.client.close()
        logger.info("MongoDB connection closed")
    except Exception as e:
        logger.error(f"Shutdown error: {str(e)}")


# ==============================
# APP INIT
# ==============================
app = FastAPI(
    title="TalentAI API",
    description="AI-powered Resume-Job Matching Backend",
    version="1.0.0",
    lifespan=lifespan
)

# ==============================
# CORS (FIXED)
# ==============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# ROUTES
# ==============================
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(main_router, prefix="/api", tags=["core"])


# ==============================
# HEALTH CHECK
# ==============================
@app.get("/")
async def root():
    return {"message": "TalentAI Backend running 🚀"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}