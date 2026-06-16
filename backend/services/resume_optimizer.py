import json
import logging
import datetime
from bson import ObjectId

from models.schemas import ResumeOptimizationResponse
from services.observability import record_llm_call
from services.generation import get_gemini_model

logger = logging.getLogger("talentai.resume_optimizer")

async def optimize_resume(user_id: str, job_description: str, db) -> ResumeOptimizationResponse:
    # Get user's latest resume
    latest = await db.resumes.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    
    if not latest:
        raise ValueError("No resume found for candidate. Please upload a resume first.")

    resume_text = latest.get("raw_text", "")
    if not resume_text:
        raise ValueError("Resume text is empty.")

    system_prompt = """You are an expert technical recruiter and resume writer.
Your job is to deeply analyze the candidate's resume against the provided job description and generate an optimization report.
You must return a JSON object that STRICTLY matches this structure:
{
  "ats_score": 0-100,
  "scoring_breakdown": {"skills_relevance": 0-100, "experience_quality": 0-100, "keyword_coverage": 0-100, "completeness": 0-100, "formatting_signals": 0-100},
  "missing_keywords": ["keyword1"],
  "important_keywords": ["keyword2"],
  "recommended_additions": ["addition1"],
  "original_summary": "Original or inferred summary",
  "improved_summary": "A much stronger, impact-driven summary",
  "job_specific_summary": "A summary tailored specifically to this job description",
  "bullet_enhancements": [
    {"original": "Weak original bullet from their resume", "improved": "Strong, impact-driven bullet with metrics"}
  ],
  "quick_wins": ["actionable quick fix"],
  "medium_term_improvements": ["improvement"],
  "high_impact_skill_additions": ["skill"]
}
"""

    prompt = f"""
--- RESUME ---
{resume_text}

--- TARGET JOB DESCRIPTION ---
{job_description}
"""

    model = get_gemini_model("gemini-2.5-flash", system_instruction=system_prompt)
    if not model:
        raise ValueError("LLM not configured.")
        
    start_time = datetime.datetime.now()
    try:
        response = await model.generate_content_async(
            prompt,
            generation_config={"response_mime_type": "application/json", "temperature": 0.2}
        )
        latency = (datetime.datetime.now() - start_time).total_seconds()
        
        try:
            tokens = response.usage_metadata.total_token_count
        except Exception:
            tokens = 0
            
        await record_llm_call(db, "gemini-2.5-flash", latency, tokens, True, "resume_optimization")

        data = json.loads(response.text)
        return ResumeOptimizationResponse(**data)
        
    except Exception as e:
        latency = (datetime.datetime.now() - start_time).total_seconds()
        await record_llm_call(db, "gemini-2.5-flash", latency, 0, False, "resume_optimization")
        logger.error(f"Error generating resume optimization: {str(e)}")
        raise ValueError("Failed to generate optimization report.")
