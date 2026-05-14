from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, BackgroundTasks, Query
from typing import List, Optional
from db.database import get_db
from models import schemas
from services.parser import parse_resume, extract_structured_data
from services.embedding import add_resume_embedding, add_job_embedding, get_resume_embedding, get_job_embedding
from services.matcher import cosine_similarity, generate_improvements
from services.auth import get_current_user, require_role, candidate_only, recruiter_only
import json
import asyncio
import datetime
import logging
from bson import ObjectId
from bson.errors import InvalidId

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Notification Helpers ---
async def create_notification(db, user_id: str, title: str, message: str, n_type: str = "info"):
    try:
        notification = {
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": n_type,
            "is_read": False,
            "created_at": datetime.datetime.utcnow()
        }
        await db.notifications.insert_one(notification)
    except Exception as e:
        logger.error(f"Error creating notification: {e}")

# --- Background Task Helpers ---
async def process_resume_background(resume_id: str, text: str):
    """
    Runs the CPU-bound sentence-transformer embedding in a thread pool executor
    so the async event loop is never blocked by the model inference.
    """
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, add_resume_embedding, resume_id, text)
        logger.info(f"Successfully processed embedding for resume {resume_id}")
    except Exception as e:
        logger.error(f"Error processing embedding for resume {resume_id}: {str(e)}")

# --- Resumes ---
@router.post("/resumes/upload")
async def upload_resume(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    db = Depends(get_db), 
    current_user: dict = Depends(candidate_only)
):
    try:
        contents = await file.read()
        text = parse_resume(contents, file.filename)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from document")
            
        structured_data = await extract_structured_data(text)
        
        resume_doc = {
            "user_id": str(current_user["_id"]),
            "parsed_data": structured_data,
            "created_at": datetime.datetime.utcnow(),
            "status": "Processing" # User can see this in UI
        }
        result = await db.resumes.insert_one(resume_doc)
        resume_id = str(result.inserted_id)
        
        # Offload heavy embedding work to background
        background_tasks.add_task(process_resume_background, resume_id, text)
        
        return {"message": "Resume uploaded successfully. AI analysis is running in the background.", "resume_id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while uploading the resume.")

# --- Jobs ---
@router.post("/jobs", response_model=schemas.JobResponse)
async def create_job(job: schemas.JobCreate, db = Depends(get_db), current_user: dict = Depends(recruiter_only)):
    try:
        new_job = job.dict()
        new_job["recruiter_id"] = str(current_user["_id"])
        new_job["created_at"] = datetime.datetime.utcnow()
        result = await db.jobs.insert_one(new_job)
        new_job["_id"] = result.inserted_id
        
        # Create embedding for job description — run in executor to avoid blocking event loop
        skills_list = job.skills if job.skills else []
        skills_text = ", ".join(skills_list)
        loop = asyncio.get_event_loop()
        background_tasks.add_task(loop.run_in_executor, None, add_job_embedding, str(result.inserted_id), job.description + " " + skills_text)
        
        return new_job
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while creating the job.")

@router.get("/jobs/meta")
async def get_job_meta(db = Depends(get_db)):
    """Returns distinct filter options (locations, job types, experience levels) for frontend dropdowns."""
    try:
        locations = await db.jobs.distinct("location", {"location": {"$ne": None}})
        job_types = await db.jobs.distinct("job_type", {"job_type": {"$ne": None}})
        experience_levels = await db.jobs.distinct("experience_level", {"experience_level": {"$ne": None}})
        return {
            "locations": sorted([l for l in locations if l]),
            "job_types": sorted([j for j in job_types if j]),
            "experience_levels": sorted([e for e in experience_levels if e]),
        }
    except Exception as e:
        logger.error(f"Error fetching job meta: {e}")
        return {"locations": [], "job_types": [], "experience_levels": []}

@router.get("/jobs", response_model=schemas.PaginatedJobResponse)
async def get_jobs(
    db = Depends(get_db),
    # --- Search ---
    q: Optional[str] = Query(None, description="Free-text search across role, company, skills, description"),
    # --- Filters ---
    location: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None),
    experience_level: Optional[str] = Query(None),
    salary_min: Optional[int] = Query(None),
    salary_max: Optional[int] = Query(None),
    status_filter: Optional[str] = Query("Active", alias="status"),
    # --- Sorting ---
    sort_by: Optional[str] = Query("latest", description="Options: latest, oldest, best_match"),
    # --- Pagination ---
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
):
    try:
        # ── Dynamic Query Builder ──────────────────────────────────────────
        query: dict = {}

        if status_filter:
            query["status"] = status_filter

        if q:
            query["$or"] = [
                {"role": {"$regex": q, "$options": "i"}},
                {"company": {"$regex": q, "$options": "i"}},
                {"description": {"$regex": q, "$options": "i"}},
                {"skills": {"$elemMatch": {"$regex": q, "$options": "i"}}},
            ]

        if location:
            query["location"] = {"$regex": location, "$options": "i"}

        if job_type:
            query["job_type"] = job_type

        if experience_level:
            query["experience_level"] = experience_level

        if salary_min is not None:
            query.setdefault("salary_max", {})
            query["salary_max"] = {"$gte": salary_min}

        if salary_max is not None:
            query.setdefault("salary_min", {})
            query["salary_min"] = {"$lte": salary_max}

        # ── Sorting ────────────────────────────────────────────────────────
        sort_map = {
            "latest": [("created_at", -1)],
            "oldest": [("created_at", 1)],
            "best_match": [("created_at", -1)],  # best_match is enriched client-side
        }
        sort_criteria = sort_map.get(sort_by, [("created_at", -1)])

        # ── Pagination ─────────────────────────────────────────────────────
        total = await db.jobs.count_documents(query)
        skip = (page - 1) * page_size
        total_pages = max(1, -(-total // page_size))  # ceiling division

        jobs = await db.jobs.find(query).sort(sort_criteria).skip(skip).limit(page_size).to_list(page_size)

        # ── Enrich with applicant stats ────────────────────────────────────
        for job in jobs:
            if isinstance(job.get("skills"), str):
                job["skills"] = [s.strip() for s in job["skills"].split(",") if s.strip()]
            elif job.get("skills") is None:
                job["skills"] = []

            cursor = db.applications.find({"job_id": str(job["_id"])})
            apps = await cursor.to_list(1000)
            job["applicant_count"] = len(apps)

            if apps:
                top_score = max(a.get("match_score", 0.0) for a in apps)
                job["top_match_score"] = top_score
            else:
                job["top_match_score"] = 0.0

        return schemas.PaginatedJobResponse(
            jobs=jobs,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except Exception as e:
        logger.error(f"Error fetching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while fetching jobs.")

@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, db = Depends(get_db), current_user: dict = Depends(recruiter_only)):
    try:
        try:
            job_oid = ObjectId(job_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid job ID format.")
            
        result = await db.jobs.delete_one({"_id": job_oid, "recruiter_id": str(current_user["_id"])})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found or unauthorized.")
        
        # Optional: delete related applications? Leaving them for now or delete them later.
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while deleting the job.")
@router.put("/jobs/{job_id}/status", response_model=schemas.JobResponse)
async def toggle_job_status(job_id: str, db = Depends(get_db), current_user: dict = Depends(recruiter_only)):
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id), "recruiter_id": str(current_user["_id"])})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        new_status = "Closed" if job.get("status", "Active") == "Active" else "Active"
        
        result = await db.jobs.find_one_and_update(
            {"_id": ObjectId(job_id)},
            {"$set": {"status": new_status}},
            return_document=True
        )
        return result
    except Exception as e:
        logger.error(f"Error toggling job status: {e}")
        raise HTTPException(status_code=500, detail="Internal error")

# --- Applications & Matching ---
@router.post("/applications", response_model=schemas.ApplicationResponse)
async def apply_to_job(application: schemas.ApplicationCreate, db = Depends(get_db), current_user: dict = Depends(candidate_only)):
    try:
        # Find latest resume for user
        resume = await db.resumes.find_one(
            {"user_id": str(current_user["_id"])}, 
            sort=[("created_at", -1)]
        )
        if not resume:
            raise HTTPException(status_code=404, detail="User has no resume. Please upload a resume first.")
            
        try:
            job_oid = ObjectId(application.job_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid job ID format.")
            
        job = await db.jobs.find_one({"_id": job_oid})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")
            
        # Check if already applied
        existing_app = await db.applications.find_one({"user_id": str(current_user["_id"]), "job_id": application.job_id})
        if existing_app:
            raise HTTPException(status_code=400, detail="You have already applied to this job.")
            
        resume_emb = get_resume_embedding(str(resume["_id"]))
        job_emb    = get_job_embedding(str(job["_id"]))

        if resume_emb is not None and len(resume_emb) > 0 and job_emb is not None and len(job_emb) > 0:
            score = cosine_similarity(resume_emb, job_emb) * 100
        else:
            # Embeddings not ready yet (background task still running)
            score = 0.0
            logger.warning(
                f"Embeddings not ready for resume {resume['_id']} or job {job['_id']}. Initial score set to 0."
            )
        
        # Build application document
        app_data = {
            "user_id": str(current_user["_id"]),
            "job_id": application.job_id,
            "match_score": score,
            "status": "Applied",
            "created_at": datetime.datetime.utcnow()
        }
        
        try:
            result = await db.applications.insert_one(app_data)
            app_data["_id"] = str(result.inserted_id)
            return app_data
        except Exception as db_err:

            logger.error(f"Database insertion error: {db_err}")
            raise HTTPException(status_code=500, detail="Failed to save application to database.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying to job: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while applying to the job.")

@router.get("/applications/my", response_model=List[schemas.ApplicationResponse])
async def get_my_applications(db = Depends(get_db), current_user: dict = Depends(candidate_only)):
    try:

        apps = await db.applications.find({"user_id": str(current_user["_id"])}).to_list(1000)
        
        # Populate job role efficiently
        for app in apps:
            job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
            if job:
                app["job_role"] = job.get("role")
                
        return apps

    except Exception as e:
        logger.error(f"Error fetching my applications: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while fetching your applications.")

@router.get("/applications/{application_id}/insights", response_model=schemas.MatchResult)
async def get_application_insights(application_id: str, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        try:
            app_oid = ObjectId(application_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid application ID format.")
            
        app = await db.applications.find_one({"_id": app_oid})
        if not app:
            raise HTTPException(status_code=404, detail="Application not found.")

        # Ownership check: only the applicant or the job's recruiter may view insights
        user_id_str = str(current_user["_id"])
        user_role   = current_user.get("role", "")
        is_owner    = app["user_id"] == user_id_str
        is_recruiter_of_job = False
        if user_role == "recruiter":
            job_check = await db.jobs.find_one({"_id": ObjectId(app["job_id"]), "recruiter_id": user_id_str})
            is_recruiter_of_job = job_check is not None
        if not is_owner and not is_recruiter_of_job:
            raise HTTPException(status_code=403, detail="Access denied.")

        resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
        job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
        
        # Auto-recalculate if score is 0 (likely due to previous model failure)
        score = app.get("match_score", 0.0)
        if score == 0.0 and resume and job:
            try:
                from services.embedding import get_resume_embedding, get_job_embedding
                from services.matcher import cosine_similarity
                res_emb = get_resume_embedding(str(resume["_id"]))
                job_emb = get_job_embedding(str(job["_id"]))
                if res_emb is not None and job_emb is not None:
                    score = cosine_similarity(res_emb, job_emb) * 100
                    await db.applications.update_one({"_id": app_oid}, {"$set": {"match_score": score}})
            except Exception as e:
                logger.error(f"Failed to auto-recalculate score: {e}")

        # Cache Check: If AI analysis was already performed, return cached data
        if "ai_analysis" in app:
            cached = app["ai_analysis"]
            return schemas.MatchResult(
                match_score=app.get("match_score", 0.0),
                missing_skills=cached.get("missing_skills", []),
                suggestions=cached.get("suggestions", []),
                strengths=cached.get("strengths", []),
                weaknesses=cached.get("weaknesses", []),
                interview_tips=cached.get("interview_tips", []),
                match_breakdown=cached.get("match_breakdown", {"skills": 0, "experience": 0, "education": 0}),
                job_role=job.get("role", "Unknown Role") if job else "Unknown Role",
                status=app.get("status", "Applied")
            )

        resume_data = json.loads(resume["parsed_data"]) if resume and "parsed_data" in resume else {}
        if isinstance(resume_data, str):
            resume_data = json.loads(resume_data)
            
        insights = await generate_improvements(resume_data.get("raw_text_preview", ""), job.get("description", "") if job else "")
        
        # Calculate Hybrid Score (40% Semantic Embedding + 60% LLM Reasoning)
        reasoning_score = insights.get("reasoning_score", score)
        final_score = (score * 0.4) + (reasoning_score * 0.6)
        
        # Persistent Cache: Save the analysis results to the application document
        await db.applications.update_one(
            {"_id": app_oid}, 
            {"$set": {
                "match_score": final_score,
                "ai_analysis": insights
            }}
        )

        return schemas.MatchResult(
            match_score=final_score,
            missing_skills=insights.get("missing_skills", []),
            suggestions=insights.get("suggestions", []),
            strengths=insights.get("strengths", []),
            weaknesses=insights.get("weaknesses", []),
            interview_tips=insights.get("interview_tips", []),
            match_breakdown=insights.get("match_breakdown", {"skills": 0, "experience": 0, "education": 0}),
            job_role=job.get("role", "Unknown Role") if job else "Unknown Role",
            status=app.get("status", "Applied")
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating insights: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while generating insights.")

@router.put("/applications/{application_id}/status", response_model=schemas.ApplicationResponse)
async def update_application_status(application_id: str, status_update: schemas.ApplicationStatusUpdate, db = Depends(get_db), current_user: dict = Depends(recruiter_only)):
    try:
        try:
            app_oid = ObjectId(application_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid application ID format.")
            
        result = await db.applications.find_one_and_update(
            {"_id": app_oid},
            {"$set": {"status": status_update.status}},
            return_document=True
        )
        
        if not result:
            raise HTTPException(status_code=404, detail="Application not found.")
            
        # Notify candidate about status change
        job = await db.jobs.find_one({"_id": ObjectId(result["job_id"])})
        job_role = job.get("role", "Job") if job else "Job"
        await create_notification(
            db, 
            result["user_id"], 
            "Application Update", 
            f"Your application for {job_role} has been updated to: {status_update.status}",
            "success" if status_update.status in ["Shortlisted", "Offered"] else "info"
        )
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating application status: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while updating status.")

# --- Recruiter Pipeline: Ranked Applicants ---
@router.get("/jobs/{job_id}/candidates", response_model=list[schemas.CandidateRanking])
async def rank_candidates(job_id: str, db = Depends(get_db), current_user: dict = Depends(recruiter_only)):
    """Legacy endpoint kept for backward compatibility."""
    try:
        applications = await db.applications.find({"job_id": job_id}).sort("match_score", -1).to_list(1000)
        results = []
        for app in applications:
            score = app.get("match_score", 0.0)
            try:
                user = await db.users.find_one({"_id": ObjectId(app["user_id"])})
                user_name = user["name"] if user else "Unknown User"
            except Exception:
                user_name = "Unknown User"
            results.append(schemas.CandidateRanking(
                user_id=app.get("user_id", ""),
                name=user_name,
                match_score=score,
                strengths=["High semantic match"] if score > 70 else ["Basic match"],
                weaknesses=[],
                application_id=str(app["_id"]),
                status=app.get("status", "Applied")
            ))
        return results
    except Exception as e:
        logger.error(f"Error ranking candidates: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while ranking candidates.")

@router.get("/jobs/{job_id}/applicants")
async def get_job_applicants(
    job_id: str,
    sort_by: Optional[str] = Query("match_score", description="match_score | recency"),
    db = Depends(get_db),
    current_user: dict = Depends(recruiter_only)
):
    """Rich applicant pipeline for recruiter dashboard. Includes AI score, fit badge, and candidate profile."""
    try:
        try:
            ObjectId(job_id)
        except InvalidId:
            raise HTTPException(status_code=400, detail="Invalid job ID.")

        sort_field = "match_score" if sort_by == "match_score" else "created_at"
        sort_dir = -1

        applications = await db.applications.find({"job_id": job_id}).sort(sort_field, sort_dir).to_list(500)

        results = []
        for app in applications:
            # Fetch user details
            try:
                user = await db.users.find_one({"_id": ObjectId(app["user_id"])})
            except Exception:
                user = None

            # Fetch latest resume
            resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
            job = await db.jobs.find_one({"_id": ObjectId(job_id)})

            # Score is fetched directly from application document
            score = app.get("match_score", 0.0)

            # Fetch latest resume parsed data
            resume_preview = None
            resume_skills = []
            try:
                resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
                if resume and resume.get("parsed_data"):
                    parsed = resume["parsed_data"]
                    if isinstance(parsed, str):
                        import json as _json
                        parsed = _json.loads(parsed)
                    resume_preview = parsed.get("raw_text_preview", "")[:300]
                    resume_skills = parsed.get("skills", [])
            except Exception:
                pass

            # Determine fit badge
            if score >= 75:
                fit_badge = "Top Fit"
            elif score >= 50:
                fit_badge = "Good Fit"
            else:
                fit_badge = "Low Fit"

            results.append({
                "application_id": str(app["_id"]),
                "user_id": app.get("user_id", ""),
                "name": user["name"] if user else "Unknown",
                "email": user.get("email", "") if user else "",
                "match_score": round(score, 1),
                "fit_badge": fit_badge,
                "status": app.get("status", "Applied"),
                "applied_at": app.get("created_at", "").isoformat() if app.get("created_at") else "",
                "resume_preview": resume_preview,
                "resume_skills": resume_skills[:10],
            })

        return results
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching applicants: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching applicants.")
@router.get("/profile-health", response_model=dict)
async def get_profile_health(db = Depends(get_db), current_user: dict = Depends(candidate_only)):
    try:
        resume = await db.resumes.find_one({"user_id": str(current_user["_id"])}, sort=[("created_at", -1)])
        if not resume:
            return {"score": 0, "status": "No Resume", "suggestions": "Upload your resume to activate AI matching."}
            
        apps = await db.applications.find({"user_id": str(current_user["_id"])}).to_list(100)
        avg_score = sum(a.get("match_score", 0.0) for a in apps) / len(apps) if apps else 50
        
        health_score = min(100, int(avg_score + (20 if len(apps) > 0 else 0)))
        
        return {
            "score": health_score,
            "status": "Healthy" if health_score > 70 else "Needs Optimization",
            "suggestions": "Your profile has high semantic density for your current roles." if health_score > 70 else "Try adding more technical skills to improve your match rate."
        }
    except Exception as e:
        logger.error(f"Error fetching profile health: {e}")
        return {"score": 0, "status": "Error", "suggestions": "Could not calculate health."}

# --- Notifications ---
@router.get("/notifications", response_model=List[schemas.NotificationResponse])
async def get_notifications(db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        notifications = await db.notifications.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).to_list(100)
        return notifications
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/notifications/{n_id}/read")
async def mark_notification_read(n_id: str, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        await db.notifications.update_one(
            {"_id": ObjectId(n_id), "user_id": str(current_user["_id"])},
            {"$set": {"is_read": True}}
        )
        return {"message": "Marked as read"}
    except Exception as e:
        logger.error(f"Error marking notification read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# --- Consolidated Recruiter Dashboard ---
@router.get("/recruiter/summary")
async def get_recruiter_summary(db = Depends(get_db), current_user: dict = Depends(recruiter_only)):
    """Consolidated endpoint for recruiter dashboard to prevent N+1 frontend fetching."""
    try:
        user_id = str(current_user["_id"])
        
        # 1. Fetch active jobs
        jobs = await db.jobs.find({"recruiter_id": user_id, "status": "Active"}).sort("created_at", -1).to_list(50)
        all_job_ids = [str(j["_id"]) for j in jobs]

        # 2. Optimized Aggregation for Stats (Counts and Averages in one go)
        stats_agg = await db.applications.aggregate([
            {"$match": {"job_id": {"$in": all_job_ids}}},
            {"$group": {
                "_id": "$job_id",
                "count": {"$sum": 1},
                "avg_score": {"$avg": "$match_score"}
            }}
        ]).to_list(None)

        stats_map = {s["_id"]: s for s in stats_agg}
        
        total_applicants = 0
        total_score_sum = 0
        scored_apps_count = 0

        # Enrich jobs with applicant counts from the aggregation map
        for job in jobs:
            job_id_str = str(job["_id"])
            j_stats = stats_map.get(job_id_str, {"count": 0, "avg_score": 0})
            job["applicant_count"] = j_stats["count"]
            total_applicants += j_stats["count"]
            
            if j_stats["avg_score"] > 0:
                total_score_sum += (j_stats["avg_score"] * j_stats["count"])
                scored_apps_count += j_stats["count"]

        avg_match_rate = int(total_score_sum / scored_apps_count) if scored_apps_count > 0 else 0
        
        # 3. Get recent activity
        recent_apps = await db.applications.find({"job_id": {"$in": all_job_ids}}).sort("created_at", -1).limit(5).to_list(5)
        
        activity = []
        for app in recent_apps:
            user = await db.users.find_one({"_id": ObjectId(app["user_id"])}, {"name": 1})
            job = next((j for j in jobs if str(j["_id"]) == app["job_id"]), None)
            if not job:
                job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])}, {"role": 1})
                
            activity.append({
                "name": user["name"] if user else "Unknown",
                "jobRole": job["role"] if job else "Unknown Role",
                "status": app["status"],
                "applied_at": app["created_at"].isoformat() if "created_at" in app else None
            })

        return {
            "stats": {
                "active_jobs": len(jobs),
                "total_candidates": total_applicants,
                "avg_match_rate": f"{avg_match_rate}%"
            },
            "jobs": jobs,
            "recent_activity": activity
        }
    except Exception as e:
        logger.error(f"Error fetching recruiter summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
