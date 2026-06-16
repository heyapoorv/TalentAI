"""
api/admin_routes.py
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from bson import ObjectId

from db.database import get_db
from models import schemas
from services import versioning, observability

router = APIRouter(prefix="/api/admin", tags=["Admin", "Observability"])

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY", "dev_admin_key_123")

def verify_admin(request: Request):
    """
    Simple API key check for admin operations.
    In production, this could be swapped for a JWT role check.
    For now, we accept either X-Admin-Key header or a user with role='recruiter'.
    """
    key = request.headers.get("X-Admin-Key")
    if key == ADMIN_SECRET_KEY:
        return True
        
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            import jwt
            payload = jwt.decode(token, options={"verify_signature": False})
            if payload.get("role") == "recruiter":
                return True
        except Exception:
            pass

    raise HTTPException(status_code=403, detail="Admin privileges required")

# ══════════════════════════════════════════════════════════════════════════════
# VERSIONING
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/versions", response_model=schemas.VersionConfig)
async def get_versions(db = Depends(get_db), _: bool = Depends(verify_admin)):
    versions = await versioning.get_current_versions(db)
    return versions

@router.put("/versions/{component}", response_model=schemas.VersionConfig)
async def update_version(
    component: str,
    update: schemas.VersionUpdate,
    db = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    try:
        new_versions = await versioning.update_version(
            component=component,
            new_value=update.new_version,
            db=db
        )
        return new_versions
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ══════════════════════════════════════════════════════════════════════════════
# REPROCESSING JOBS
# ══════════════════════════════════════════════════════════════════════════════

async def _run_reprocessing_job(job_id: str, db, job_type: str, item_ids: Optional[List[str]], all_items: bool):
    """Background task to simulate reprocessing since real logic depends on specific services."""
    try:
        # Mark running
        await db.reprocessing_jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "running", "started_at": datetime.now(timezone.utc)}}
        )
        
        # Determine total
        if not all_items and item_ids:
            total = len(item_ids)
        else:
            # Mocking total for full rebuilds
            col_name = "resumes" if "resumes" in job_type else "applications"
            total = await db[col_name].count_documents({})
            
        await db.reprocessing_jobs.update_one({"_id": job_id}, {"$set": {"total": total}})
        
        # Simulated progress
        import asyncio
        processed = 0
        for i in range(total):
            await asyncio.sleep(0.5) # Simulate work
            processed += 1
            if i % 5 == 0:
                await db.reprocessing_jobs.update_one({"_id": job_id}, {"$set": {"processed": processed}})
                
        # Mark complete
        await db.reprocessing_jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "completed", "processed": processed, "completed_at": datetime.now(timezone.utc)}}
        )
        observability.record_metric("reprocess_job", job_type=job_type, status="completed", processed=processed)
        
    except Exception as e:
        await db.reprocessing_jobs.update_one(
            {"_id": job_id},
            {"$set": {"status": "failed", "completed_at": datetime.now(timezone.utc), "errors": [{"error": str(e)}]}}
        )
        observability.record_metric("reprocess_job", job_type=job_type, status="failed")

@router.post("/reprocess-{item_type}", response_model=schemas.ReprocessingJobResponse)
async def start_reprocessing(
    item_type: str, # "resumes", "applications", "embeddings", "ai-analysis"
    job_req: schemas.ReprocessingJobCreate,
    bg_tasks: BackgroundTasks,
    db = Depends(get_db),
    _: bool = Depends(verify_admin)
):
    if item_type not in ["resumes", "applications", "embeddings", "ai-analysis"]:
        raise HTTPException(status_code=400, detail="Invalid item type for reprocessing")
        
    job_id = str(uuid.uuid4())
    job_doc = {
        "_id": job_id,
        "type": item_type,
        "status": "pending",
        "total": 0,
        "processed": 0,
        "failed": 0,
        "errors": [],
        "created_at": datetime.now(timezone.utc)
    }
    await db.reprocessing_jobs.insert_one(job_doc)
    
    # Start background execution
    bg_tasks.add_task(_run_reprocessing_job, job_id, db, item_type, job_req.item_ids, job_req.all)
    
    return {**job_doc, "id": job_id}

@router.get("/jobs", response_model=List[schemas.ReprocessingJobResponse])
async def list_jobs(db = Depends(get_db), _: bool = Depends(verify_admin)):
    jobs = await db.reprocessing_jobs.find({}).sort("created_at", -1).limit(20).to_list(20)
    for j in jobs:
        j["id"] = j.pop("_id")
    return jobs

@router.get("/jobs/{job_id}", response_model=schemas.ReprocessingJobResponse)
async def get_job_status(job_id: str, db = Depends(get_db), _: bool = Depends(verify_admin)):
    job = await db.reprocessing_jobs.find_one({"_id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job["id"] = job.pop("_id")
    return job

# ══════════════════════════════════════════════════════════════════════════════
# OBSERVABILITY METRICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/metrics/summary", response_model=schemas.MetricsSummary)
async def get_metrics_summary(hours: int = 24, db = Depends(get_db), _: bool = Depends(verify_admin)):
    stats = await observability.get_dashboard_stats(db, since_hours=hours)
    return stats

from pydantic import BaseModel
class MetricEvent(BaseModel):
    event_type: str
    data: dict

@router.post("/metrics/event")
async def record_metric_event(event: MetricEvent, request: Request):
    user_id = "anonymous"
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            import jwt
            payload = jwt.decode(auth_header[7:], options={"verify_signature": False})
            user_id = payload.get("sub", "anonymous")
        except Exception:
            pass
            
    observability.record_metric(event.event_type, user_id=user_id, **event.data)
    return {"status": "recorded"}
