from dotenv import load_dotenv
load_dotenv()

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient

from db.database import db, MONGO_URL, DB_NAME
from api.routes import router as main_router
from api.auth_routes import router as auth_router
from middleware.logging_middleware import configure_logging, RequestLoggingMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.security import SecurityHeadersMiddleware
from services.embedding import load_model

# ── Bootstrap logging before anything else ───────────────────────────────────
configure_logging(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("talentai.main")

ENVIRONMENT   = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
).split(",")]


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("startup_begin", extra={"environment": ENVIRONMENT})
    try:
        # MongoDB
        db.client   = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        db.database = db.client[DB_NAME]
        # Quick connectivity check
        await db.client.admin.command("ping")
        logger.info("mongodb_connected", extra={"url": MONGO_URL, "db": DB_NAME})

        # Embedding model
        load_model()
        logger.info("embedding_model_loaded")

        # Ensure collections
        existing  = await db.database.list_collection_names()
        required  = ["users", "resumes", "jobs", "applications", "notifications"]
        for col in required:
            if col not in existing:
                await db.database.create_collection(col)
                logger.info("collection_created", extra={"collection": col})

        # ── MongoDB indexes ────────────────────────────────────────────────
        # Users
        await db.database.users.create_index("email", unique=True)

        # Resumes
        await db.database.resumes.create_index("user_id")
        await db.database.resumes.create_index([("user_id", 1), ("created_at", -1)])

        # Jobs — compound indexes for filter queries
        await db.database.jobs.create_index("recruiter_id")
        await db.database.jobs.create_index([("status", 1), ("created_at", -1)])
        await db.database.jobs.create_index("job_type")
        await db.database.jobs.create_index("experience_level")
        await db.database.jobs.create_index("location")
        await db.database.jobs.create_index([("salary_min", 1), ("salary_max", 1)])

        # Applications
        await db.database.applications.create_index(
            [("user_id", 1), ("job_id", 1)], unique=True
        )
        await db.database.applications.create_index("job_id")
        await db.database.applications.create_index([("job_id", 1), ("match_score", -1)])
        await db.database.applications.create_index([("job_id", 1), ("created_at", -1)])

        # Notifications
        await db.database.notifications.create_index([("user_id", 1), ("created_at", -1)])
        await db.database.notifications.create_index([("user_id", 1), ("is_read", 1)])

        logger.info("indexes_ensured")
    except Exception as exc:
        logger.error("startup_failed", extra={"error": str(exc)})
        raise

    yield  # ← application runs here

    # Shutdown
    try:
        db.client.close()
        logger.info("mongodb_disconnected")
    except Exception as exc:
        logger.error("shutdown_error", extra={"error": str(exc)})


# ── Application factory ───────────────────────────────────────────────────────
app = FastAPI(
    title="TalentAI API",
    description="AI-powered Resume-Job Matching Platform",
    version="2.0.0",
    docs_url="/docs"     if ENVIRONMENT != "production" else None,
    redoc_url="/redoc"   if ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# ── Middleware stack (order matters — outermost = first to run) ────────────────
# 1. Security headers
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate limiting
app.add_middleware(
    RateLimitMiddleware,
    default_limit=int(os.getenv("RATE_LIMIT_DEFAULT", 60)),
    auth_limit=int(os.getenv("RATE_LIMIT_AUTH", 10)),
    window_seconds=60,
)

# 3. Request logging + tracing
app.add_middleware(RequestLoggingMiddleware)

# 4. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "X-Response-Time", "X-RateLimit-Remaining"],
)


# ── Global exception handlers ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        "unhandled_exception",
        extra={
            "request_id": request_id,
            "path":  request.url.path,
            "error": str(exc),
        },
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail":     "An unexpected error occurred. Please try again later.",
            "request_id": request_id,
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
    )


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(main_router, prefix="/api",      tags=["core"])


# ── Health + Root ─────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {"service": "TalentAI API", "version": "2.0.0", "status": "running"}


@app.get("/health", tags=["ops"])
async def health_check():
    """Liveness probe — used by Docker / load balancers."""
    try:
        await db.client.admin.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        logger.error("health_check_failed", extra={"error": str(exc)})
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"},
        )