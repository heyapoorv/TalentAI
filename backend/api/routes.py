from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from typing import List
from db.database import get_db
from models import schemas
from services.parser import parse_resume, extract_structured_data
from services.embedding import add_resume_embedding, add_job_embedding, get_resume_embedding, get_job_embedding
from services.matcher import cosine_similarity, generate_improvements
from services.auth import get_current_user
from bson import ObjectId
from bson.errors import InvalidId
import json
import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Resumes ---
@router.post("/resumes/upload")
async def upload_resume(file: UploadFile = File(...), db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        if current_user.get("role") != "Candidate":
            pass # Optional role validation
            
        contents = await file.read()
        text = parse_resume(contents, file.filename)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from document")
            
        structured_data = extract_structured_data(text)
        
        resume_doc = {
            "user_id": str(current_user["_id"]),
            "parsed_data": structured_data,
            "created_at": datetime.datetime.utcnow()
        }
        result = await db.resumes.insert_one(resume_doc)
        resume_id = str(result.inserted_id)
        
        # Add embedding synchronously for now
        add_resume_embedding(resume_id, text)
        
        return {"message": "Resume uploaded successfully", "resume_id": resume_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while uploading the resume.")

# --- Jobs ---
@router.post("/jobs", response_model=schemas.JobResponse)
async def create_job(job: schemas.JobCreate, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        new_job = job.dict()
        new_job["recruiter_id"] = str(current_user["_id"])
        new_job["created_at"] = datetime.datetime.utcnow()
        result = await db.jobs.insert_one(new_job)
        new_job["_id"] = result.inserted_id
        
        # Create embedding for job description
        skills_list = job.skills if job.skills else []
        skills_text = ", ".join(skills_list)
        add_job_embedding(str(result.inserted_id), job.description + " " + skills_text)
        
        return new_job
    except Exception as e:
        logger.error(f"Error creating job: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while creating the job.")

@router.get("/jobs", response_model=List[schemas.JobResponse])
async def get_jobs(db = Depends(get_db)):
    try:
        jobs = await db.jobs.find().to_list(1000)
        # Resiliency: Ensure skills is a list
        for job in jobs:
            if isinstance(job.get("skills"), str):
                job["skills"] = [s.strip() for s in job["skills"].split(",") if s.strip()]
            elif job.get("skills") is None:
                job["skills"] = []
            
            # Get applicant count and top match score
            cursor = db.applications.find({"job_id": str(job["_id"])})
            apps = await cursor.to_list(1000)
            job["applicant_count"] = len(apps)
            
            if apps:
                # Recalculate if all scores are 0 (likely from previous failed model load)
                top_score = max(a.get("match_score", 0.0) for a in apps)
                if top_score == 0.0:
                    try:
                        # Just try to fix the top one to save time
                        job_emb = get_job_embedding(str(job["_id"]))
                        if job_emb:
                            for app in apps:
                                resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
                                if resume:
                                    res_emb = get_resume_embedding(str(resume["_id"]))
                                    if res_emb:
                                        score = cosine_similarity(res_emb, job_emb) * 100
                                        await db.applications.update_one({"_id": app["_id"]}, {"$set": {"match_score": score}})
                                        top_score = max(top_score, score)
                    except Exception:
                        pass
                job["top_match_score"] = top_score
            else:
                job["top_match_score"] = 0.0
            
        return jobs
    except Exception as e:
        logger.error(f"Error fetching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while fetching jobs.")

@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
async def toggle_job_status(job_id: str, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
async def apply_to_job(application: schemas.ApplicationCreate, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
        job_emb = get_job_embedding(str(job["_id"]))
        
        score = cosine_similarity(resume_emb, job_emb) * 100
        
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
async def get_my_applications(db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:

        apps = await db.applications.find({"user_id": str(current_user["_id"])}).to_list(1000)
        
        # Auto-recalculate 0 scores and populate job role
        for app in apps:
            job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
            if job:
                app["job_role"] = job.get("role")
                
            if app.get("match_score", 0.0) == 0.0:
                try:
                    resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
                    if resume and job:
                        from services.embedding import get_resume_embedding, get_job_embedding
                        res_emb = get_resume_embedding(str(resume["_id"]))
                        job_emb = get_job_embedding(str(job["_id"]))
                        if res_emb and job_emb:
                            from services.matcher import cosine_similarity
                            score = cosine_similarity(res_emb, job_emb) * 100
                            await db.applications.update_one({"_id": app["_id"]}, {"$set": {"match_score": score}})
                            app["match_score"] = score
                except Exception:
                    pass

                    
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
            
        resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
        job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
        
        # Auto-recalculate if score is 0 (likely due to previous model failure)
        score = app.get("match_score", 0.0)
        if score == 0.0 and resume and job:
            try:
                from services.embedding import get_resume_embedding, get_job_embedding
                res_emb = get_resume_embedding(str(resume["_id"]))
                job_emb = get_job_embedding(str(job["_id"]))
                if res_emb and job_emb:
                    score = cosine_similarity(res_emb, job_emb) * 100
                    await db.applications.update_one({"_id": app_oid}, {"$set": {"match_score": score}})
            except Exception as e:
                logger.error(f"Failed to auto-recalculate score: {e}")

        resume_data = json.loads(resume["parsed_data"]) if resume and "parsed_data" in resume else {}
        # Ensure it's a dict
        if isinstance(resume_data, str):
            resume_data = json.loads(resume_data)
            
        insights = await generate_improvements(resume_data.get("raw_text_preview", ""), job.get("description", "") if job else "")
        
        # Calculate Hybrid Score (40% Semantic Embedding + 60% LLM Reasoning)
        reasoning_score = insights.get("reasoning_score", score)
        final_score = (score * 0.4) + (reasoning_score * 0.6)
        
        # Update DB with more accurate score if it changed significantly
        if abs(final_score - app.get("match_score", 0.0)) > 1.0:
            await db.applications.update_one({"_id": app_oid}, {"$set": {"match_score": final_score}})

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
async def update_application_status(application_id: str, status_update: schemas.ApplicationStatusUpdate, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating application status: {str(e)}")
        raise HTTPException(status_code=500, detail="An internal server error occurred while updating status.")

# --- Recruiter Ranking ---
@router.get("/jobs/{job_id}/candidates", response_model=list[schemas.CandidateRanking])
async def rank_candidates(job_id: str, db = Depends(get_db), current_user: dict = Depends(get_current_user)):
    try:
        applications = await db.applications.find({"job_id": job_id}).sort("match_score", -1).to_list(1000)
        
        results = []
        for app in applications:
            # Handle potentially missing or zero match scores from previous failed model loads
            score = app.get("match_score", 0.0)
            if score == 0.0:
                try:
                    resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
                    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
                    if resume and job:
                        resume_emb = get_resume_embedding(str(resume["_id"]))
                        job_emb = get_job_embedding(str(job["_id"]))
                        if resume_emb and job_emb:
                            score = cosine_similarity(resume_emb, job_emb) * 100
                            # Update the record for future fast access
                            await db.applications.update_one({"_id": app["_id"]}, {"$set": {"match_score": score}})
                except Exception as e:
                    logger.error(f"Error recalculating score for {app['_id']}: {e}")

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
@router.get("/profile-health", response_model=dict)
async def get_profile_health(db = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
