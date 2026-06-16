"""
services/recruiter_intelligence.py

AI services for the Recruiter Intelligence Suite.
Handles comparisons, hiring recommendations, scorecards, and explanations.
"""
import os
import json
import logging
from typing import List, Dict, Any
from bson import ObjectId
import google.generativeai as genai

from models import schemas
from services.observability import record_gemini_call

logger = logging.getLogger("talentai.recruiter_intelligence")

from services.generation import get_gemini_model

def _clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

async def _call_llm_json(prompt: str, path: str = "recruiter_intelligence") -> Dict[str, Any]:
    model = get_gemini_model()
    if not model:
        raise RuntimeError("Gemini API not configured")
        
    import time
    t0 = time.perf_counter()
    tokens = 0
    success = False
    
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.4}
        )
        try:
            tokens = response.usage_metadata.total_token_count
        except Exception:
            pass
            
        text = _clean_json_text(response.text)
        result = json.loads(text)
        success = True
        return result
    except Exception as e:
        logger.error(f"Intelligence LLM failed: {e}")
        raise e
    finally:
        latency = (time.perf_counter() - t0) * 1000
        record_gemini_call(path=path, latency_ms=latency, tokens_used=tokens, success=success)

# ══════════════════════════════════════════════════════════════════════════════
# COMPARES
# ══════════════════════════════════════════════════════════════════════════════

async def compare_candidates(job_id: str, application_ids: List[str], db) -> schemas.CandidateComparisonResponse:
    if not 2 <= len(application_ids) <= 5:
        raise ValueError("Must compare between 2 and 5 candidates")

    # Fetch Job
    job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    if not job:
        raise ValueError("Job not found")
        
    job_ctx = f"Role: {job.get('role')}\nDesc: {job.get('description', '')[:2000]}\nSkills: {', '.join(job.get('skills', []))}"

    # Fetch Applications and Resumes
    apps = []
    candidates_ctx = ""
    for idx, app_id in enumerate(application_ids):
        app = await db.applications.find_one({"_id": ObjectId(app_id)})
        if not app:
            continue
        user = await db.users.find_one({"_id": ObjectId(app["user_id"])})
        resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
        
        cname = user["name"] if user else f"Candidate {idx+1}"
        resume_text = resume.get("raw_text", "")[:3000] if resume else "No resume found."
        score = app.get("match_score", 0)
        
        apps.append({"id": app_id, "name": cname})
        candidates_ctx += f"\n\n--- CANDIDATE: {cname} (ID: {app_id}) (AI Score: {score}) ---\n{resume_text}"

    prompt = f"""You are a Staff Technical Recruiter comparing candidates for a role.
    
    JOB DESCRIPTION:
    {job_ctx}
    
    CANDIDATES:{candidates_ctx}
    
    Analyze the candidates and return a JSON object with this exact structure:
    {{
      "best_overall_id": "<candidate ID>",
      "best_technical_id": "<candidate ID>",
      "fastest_ramp_up_id": "<candidate ID>",
      "highest_risk_id": "<candidate ID>",
      "hiring_recommendation": "<overall summary of the comparison>",
      "comparison_table": [
        {{
          "category": "Technical Skills",
          "<candidate_1_name>": "<assessment>",
          "<candidate_2_name>": "<assessment>"
          // include all candidates
        }},
        {{
          "category": "Experience & Seniority",
          // ...
        }}
        // add more categories like Communication, Education, Risk Factors
      ]
    }}
    """
    
    res = await _call_llm_json(prompt, "compare_candidates")
    return schemas.CandidateComparisonResponse(**res)


# ══════════════════════════════════════════════════════════════════════════════
# RECOMMENDATIONS
# ══════════════════════════════════════════════════════════════════════════════

async def generate_hiring_recommendation(application_id: str, db) -> schemas.HiringRecommendation:
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise ValueError("Application not found")
        
    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
    
    ai_analysis = app.get("ai_analysis", {})
    score = app.get("match_score", 0)
    job_desc = job.get('description', '')[:2000] if job else ''
    resume_text = resume.get('raw_text', '')[:3000] if resume else ''
    
    prompt = f"""You are an elite Talent Intelligence AI. Evaluate this application and output a final hiring recommendation.
    
    JOB REQUIREMENTS:
    {job_desc}
    
    CANDIDATE RESUME:
    {resume_text}
    
    PREVIOUS AI SCORE: {score}/100
    STRENGTHS: {ai_analysis.get('strengths', [])}
    WEAKNESSES: {ai_analysis.get('weaknesses', [])}
    
    Output JSON exactly like this:
    {{
      "recommendation": "Strong Yes", // Options: "Strong Yes", "Yes", "Maybe", "No"
      "confidence": 85, // Integer 0-100
      "reasons": ["Reason 1", "Reason 2"],
      "risks": ["Risk 1", "Risk 2"],
      "interview_focus": ["Area to probe 1", "Area to probe 2"]
    }}
    """
    
    res = await _call_llm_json(prompt, "hiring_recommendation")
    rec = schemas.HiringRecommendation(**res)
    
    # Persist
    await db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"hiring_recommendation": rec.dict()}}
    )
    return rec


# ══════════════════════════════════════════════════════════════════════════════
# EXPLANATION LAYER
# ══════════════════════════════════════════════════════════════════════════════

async def explain_ranking(application_id: str, db) -> schemas.RankingExplanationResponse:
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise ValueError("Application not found")
        
    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
    
    score = app.get("match_score", 0)
    ai_analysis = app.get("ai_analysis", {})
    
    prompt = f"""As an AI Recruiter, explain why this candidate received a Match Score of {score}/100.
    
    Job Skills Required: {job.get('skills', []) if job else []}
    Candidate Missing Skills: {ai_analysis.get('missing_skills', [])}
    
    Output JSON:
    {{
      "application_id": "{application_id}",
      "rank_rationale": "Detailed paragraph explaining the score.",
      "satisfied_requirements": ["Req 1", "Req 2"],
      "missing_requirements": ["Req A"]
    }}
    """
    
    res = await _call_llm_json(prompt, "ranking_explanation")
    explanation = schemas.RankingExplanationResponse(**res)
    
    # Persist
    await db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"ranking_explanation": explanation.dict()}}
    )
    return explanation


# ══════════════════════════════════════════════════════════════════════════════
# INTERVIEW SCORECARDS
# ══════════════════════════════════════════════════════════════════════════════

async def generate_interview_scorecard(application_id: str, db) -> schemas.InterviewScorecardResponse:
    app = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app:
        raise ValueError("Application not found")
        
    job = await db.jobs.find_one({"_id": ObjectId(app["job_id"])})
    resume = await db.resumes.find_one({"user_id": app["user_id"]}, sort=[("created_at", -1)])
    
    job_desc = job.get('description', '')[:2000] if job else ''
    resume_text = resume.get('raw_text', '')[:2000] if resume else ''
    
    prompt = f"""Generate a targeted interview scorecard for evaluating this candidate against this job.
    Focus on their specific gaps or areas where their experience is ambiguous.
    
    JOB: {job_desc}
    CANDIDATE: {resume_text}
    
    Output JSON:
    {{
      "application_id": "{application_id}",
      "job_id": "{str(app['job_id'])}",
      "overall_guidance": "Brief instructions for the interviewer",
      "criteria": [
        {{
          "category": "Technical Architecture",
          "question": "Can you walk me through...",
          "expected_answer": "Look for signs of...",
          "max_score": 5
        }}
        // Generate 4-6 highly specific criteria
      ]
    }}
    """
    
    res = await _call_llm_json(prompt, "interview_scorecard")
    return schemas.InterviewScorecardResponse(**res)
