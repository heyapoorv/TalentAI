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
from api.copilot_routes import router as copilot_router
from api.admin_routes import router as admin_router
from middleware.logging_middleware import configure_logging, RequestLoggingMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.security import SecurityHeadersMiddleware
from services.embedding import load_model
from services import versioning, observability

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
        # Validate critical environment variables
        required_envs = ["MONGO_URL", "JWT_SECRET_KEY", "GEMINI_API_KEY"]
        missing_envs = [env for env in required_envs if not os.getenv(env)]
        if missing_envs:
            logger.error("missing_environment_variables", extra={"missing": missing_envs})
            raise RuntimeError(f"Missing required environment variables: {', '.join(missing_envs)}")

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
        required  = [
            "users", "resumes", "jobs", "applications", "notifications",
            "copilot_sessions", "copilot_messages",
            "ai_versions", "reprocessing_jobs", "metrics",
        ]
        from pymongo.errors import CollectionInvalid
        for col in required:
            if col not in existing:
                try:
                    await db.database.create_collection(col)
                    logger.info("collection_created", extra={"collection": col})
                except CollectionInvalid:
                    pass

        # Initialize services
        versioning.set_db(db.database)
        observability.set_db(db.database)
        await observability.ensure_metrics_indexes(db.database)

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

        # Copilot sessions & messages
        await db.database.copilot_sessions.create_index([("user_id", 1), ("updated_at", -1)])
        await db.database.copilot_messages.create_index([("session_id", 1), ("created_at", 1)])
        await db.database.copilot_messages.create_index("user_id")

        # Workspace RAG removed in audit


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
    allow_methods=["*"],
    allow_headers=["*"],
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
    response = JSONResponse(
        status_code=500,
        content={
            "detail":     "An unexpected error occurred. Please try again later.",
            "request_id": request_id,
        },
    )
    
    # Record to observability
    try:
        from services.observability import record_error
        record_error(error_type=type(exc).__name__, path=request.url.path, message=str(exc))
    except Exception:
        pass
    
    return response


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)},
    )


# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(auth_router,    prefix="/api/auth",      tags=["auth"])
app.include_router(main_router,    prefix="/api",            tags=["core"])
app.include_router(copilot_router, prefix="/api/copilot",   tags=["copilot"])
app.include_router(admin_router)


# ── Health + Root ─────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {"service": "TalentAI API", "version": "2.0.0", "status": "running"}


@app.get("/health", tags=["ops"])
async def health_check():
    """Liveness probe — used by Docker / load balancers."""
    try:
        if not db.client:
            raise RuntimeError("Database client not initialized")
        await db.client.admin.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        logger.error("health_check_failed", extra={"error": str(exc)})
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected"},
        )