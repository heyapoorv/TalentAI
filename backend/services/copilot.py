"""
services/copilot.py

TalentAI-native Copilot service.

Unlike the generic RAG pipeline (which uses Qdrant + chunking), the Copilot
works directly with TalentAI's MongoDB collections — because resume text +
job descriptions fit comfortably within Gemini 2.5 Flash's 1M-token window.

Pipeline per message:
  1. Load resume text from `resumes` collection
  2. Load job description from `jobs` collection (if job_id)
  3. Load AI match analysis from `applications` collection (if exists)
  4. Build structured system prompt (role-specific)
  5. Load conversation history (Redis → in-process LRU fallback)
  6. Call Gemini 2.5 Flash
  7. Parse answer + generate 3 follow-up suggestion chips
  8. Return { answer, suggestions }
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("talentai.copilot")

# ── In-process LRU session history (Redis fallback) ──────────────────────────
_MAX_SESSIONS  = 500
_MAX_TURNS     = 20   # turns per session (user + assistant = 1 turn)

class _LRUSessionStore:
    """Thread-safe LRU dict capped at _MAX_SESSIONS entries."""
    def __init__(self, maxsize: int = _MAX_SESSIONS):
        self._store: OrderedDict[str, List[Dict]] = OrderedDict()
        self._maxsize = maxsize

    def get(self, key: str) -> List[Dict]:
        if key not in self._store:
            return []
        self._store.move_to_end(key)
        return list(self._store[key])

    def append(self, key: str, message: Dict) -> None:
        history = self._store.pop(key, [])
        history.append(message)
        history = history[-(_MAX_TURNS * 2):]   # keep last N turns
        self._store[key] = history
        self._store.move_to_end(key)
        if len(self._store) > self._maxsize:
            self._store.popitem(last=False)

    def clear(self, key: str) -> None:
        self._store.pop(key, None)


_lru_store = _LRUSessionStore()


# ══════════════════════════════════════════════════════════════════════════════
# SESSION HISTORY  (Redis → in-process LRU fallback)
# ══════════════════════════════════════════════════════════════════════════════

async def _get_history(session_id: str) -> List[Dict]:
    try:
        from services.cache import get_session_history
        return await get_session_history(session_id)
    except Exception:
        return _lru_store.get(session_id)


async def _append_history(session_id: str, message: Dict) -> None:
    try:
        from services.cache import append_session_message
        await append_session_message(session_id, message)
    except Exception:
        _lru_store.append(session_id, message)


async def clear_copilot_history(session_id: str) -> None:
    try:
        from services.cache import clear_session_history
        await clear_session_history(session_id)
    except Exception:
        pass
    _lru_store.clear(session_id)


# ══════════════════════════════════════════════════════════════════════════════
# CONTEXT BUILDERS
# ══════════════════════════════════════════════════════════════════════════════

async def build_candidate_context(
    resume_id: Optional[str],
    job_id: Optional[str],
    user_id: str,
    db,
) -> Tuple[str, str, str]:
    """
    Build context strings for the candidate copilot.
    Returns (resume_context, job_context, analysis_context).
    """
    # ── Resume ─────────────────────────────────────────────────────────────
    resume_ctx = ""
    if resume_id:
        resume = await db.resumes.find_one({"_id": __oid(resume_id)})
    else:
        # Auto-select latest resume for this user
        resume = await db.resumes.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)],
        )

    if resume:
        parsed = resume.get("parsed_data") or {}
        raw    = resume.get("raw_text", "")
        name   = parsed.get("name", "Candidate")

        skills     = parsed.get("skills", [])
        experience = parsed.get("experience", [])
        education  = parsed.get("education", [])
        summary    = parsed.get("summary", "")

        resume_ctx = f"""
=== CANDIDATE RESUME ===
Name: {name}
Summary: {summary}

Skills: {", ".join(skills) if skills else "Not specified"}

Experience:
{_format_experience(experience)}

Education:
{_format_education(education)}

Full Resume Text:
{raw[:8000] if raw else "Not available"}
""".strip()

    # ── Job ─────────────────────────────────────────────────────────────────
    job_ctx = ""
    if job_id:
        from bson import ObjectId
        try:
            job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        except Exception:
            job = None
        if job:
            skills_req = job.get("skills", [])
            job_ctx = f"""
=== JOB DESCRIPTION ===
Title: {job.get("role", "N/A")}
Company: {job.get("company", "N/A")}
Location: {job.get("location", "Not specified")}
Type: {job.get("job_type", "Not specified")}
Experience Level: {job.get("experience_level", "Not specified")}
Salary: {_format_salary(job)}

Required Skills: {", ".join(skills_req) if skills_req else "Not listed"}

Description:
{job.get("description", "Not available")[:5000]}
""".strip()

    # ── Existing AI match analysis ──────────────────────────────────────────
    analysis_ctx = ""
    if job_id and user_id:
        from bson import ObjectId
        app = await db.applications.find_one(
            {"user_id": user_id, "job_id": job_id}
        )
        if app and app.get("match_result"):
            mr = app["match_result"]
            breakdown = mr.get("match_breakdown", {})
            analysis_ctx = f"""
=== AI MATCH ANALYSIS ===
Overall Match Score: {mr.get("match_score", 0):.0f}%
Skills Match: {breakdown.get("skills", 0):.0f}%
Experience Match: {breakdown.get("experience", 0):.0f}%
Education Match: {breakdown.get("education", 0):.0f}%

Strengths:
{_bullet_list(mr.get("strengths", []))}

Gaps / Weaknesses:
{_bullet_list(mr.get("weaknesses", []) or mr.get("missing_skills", []))}

Interview Tips:
{_bullet_list(mr.get("interview_tips", []))}

AI Suggestions:
{_bullet_list(mr.get("suggestions", []))}
""".strip()

    return resume_ctx, job_ctx, analysis_ctx


async def build_recruiter_context(job_id: str, db) -> str:
    """
    Build context for the Recruiter Copilot:
    job description + top applicants with their match data.
    """
    from bson import ObjectId
    try:
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
    except Exception:
        return "Job not found."

    if not job:
        return "Job not found."

    # Get top 10 applicants sorted by match score
    apps = await db.applications.find(
        {"job_id": job_id}
    ).sort("match_score", -1).limit(10).to_list(10)

    applicant_summaries = []
    for i, app in enumerate(apps, 1):
        # Get candidate name
        from bson import ObjectId as OID
        try:
            user = await db.users.find_one({"_id": OID(app.get("user_id", ""))})
            cname = user.get("name", "Unknown") if user else "Unknown"
        except Exception:
            cname = "Unknown"

        mr = app.get("match_result", {})
        hr = app.get("hiring_recommendation", {})
        expl = app.get("ranking_explanation", {})
        
        summary = (
            f"{i}. {cname} — Score: {app.get('match_score', 0):.0f}%\n"
            f"   Status: {app.get('status', 'Pending')}\n"
            f"   Recommendation: {hr.get('recommendation', 'Pending')} (Confidence: {hr.get('confidence', 0)}%)\n"
            f"   Strengths: {', '.join((mr.get('strengths') or [])[:3])}\n"
            f"   Risks: {', '.join((hr.get('risks') or mr.get('weaknesses') or mr.get('missing_skills') or [])[:3])}\n"
            f"   Explanation: {expl.get('rank_rationale', 'N/A')}\n"
        )
        applicant_summaries.append(summary)

    skills_req = job.get("skills", [])
    return f"""
=== JOB POSTING ===
Title: {job.get("role", "N/A")}
Company: {job.get("company", "N/A")}
Location: {job.get("location", "N/A")}
Required Skills: {", ".join(skills_req)}

Description:
{job.get("description", "")[:3000]}

=== APPLICANT POOL ({len(apps)} candidates) ===
{chr(10).join(applicant_summaries) if applicant_summaries else "No applicants yet."}
""".strip()


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

_SYSTEM_PROMPTS: Dict[str, str] = {
    "resume_only": """You are an expert career coach and resume specialist with 15+ years of experience.
You have been given the candidate's complete resume. Your role is to help them understand their profile,
identify strengths, spot improvement opportunities, and strategize their career direction.
Be specific, actionable, and encouraging. Use bullet points where clarity is improved.
Always ground your advice in specific details from their resume.""",

    "job_match": """You are a senior hiring advisor and talent intelligence expert.
You have the candidate's full resume, the complete job description, and an AI-generated match analysis.
Your role is to give the candidate a crystal-clear, honest assessment of their fit for this specific role.
Highlight genuine strengths, flag real gaps, and provide actionable advice to close those gaps.
Be direct and specific — reference actual skills, companies, or experiences from the documents.""",

    "interview_prep": """You are an elite interview coach who has helped thousands of candidates land top roles.
You have the candidate's resume and the specific job they're applying for.
Your role is to prepare them comprehensively: generate likely interview questions, suggest STAR-format answers
based on their actual experience, identify behavioral questions they should prepare for, and point out
topics they need to study based on gaps between their profile and the job requirements.
Be thorough, practical, and confidence-building.""",

    "career_advice": """You are a trusted senior career strategist with deep knowledge of the technology industry.
You have the candidate's complete resume as context.
Your role is to provide thoughtful, personalized career guidance: career path options, skills to develop,
industries that align with their background, and long-term growth strategies.
Think big picture but ground your advice in their specific background and experience.""",

    "recruiter_review": """You are an AI hiring copilot assisting an experienced recruiter.
You have the full job description and a ranked list of applicants with their match scores, hiring recommendations, risks, and ranking explanations.
Your role is to help the recruiter make faster, better-informed decisions: summarize the candidate pool,
compare applicants explicitly highlighting differences in technical skills vs culture vs risk, draft communications, generate interview questions for specific candidates,
flag potential concerns, and provide data-driven hiring recommendations.
When asked 'Why is Candidate A ranked first' or similar ranking questions, explicitly reference the provided 'Explanation' and 'Recommendation' fields.
Be concise, decisive, and professional.""",
}


# ══════════════════════════════════════════════════════════════════════════════
# GEMINI CALLER
# ══════════════════════════════════════════════════════════════════════════════

def _get_gemini():
    """Lazily initialise Gemini 2.5 Flash."""
    import google.generativeai as genai
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        return genai.GenerativeModel("gemini-2.5-flash")
    except Exception as exc:
        logger.error("copilot_gemini_init_failed", extra={"error": str(exc)})
        return None


async def _call_gemini_chat(
    system_prompt: str,
    context: str,
    history: List[Dict],
    user_message: str,
    timeout: float = 45.0,
) -> str:
    """Call Gemini 2.5 Flash with conversation history."""
    import google.generativeai as genai

    model = _get_gemini()
    if not model:
        raise RuntimeError("Gemini not configured — check GEMINI_API_KEY")

    # Build Gemini chat history format
    gemini_history = []
    for msg in history[-(_MAX_TURNS * 2):]:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})

    # Full prompt: system + context + user question
    full_system = f"{system_prompt}\n\n{context}" if context.strip() else system_prompt

    async def _generate():
        chat = model.start_chat(history=gemini_history)
        # Inject system context on first message or as preamble
        if not gemini_history:
            preamble = f"[CONTEXT]\n{full_system}\n\n[USER QUESTION]\n{user_message}"
        else:
            preamble = user_message

        response = await chat.send_message_async(
            preamble,
            generation_config=genai.GenerationConfig(
                temperature=0.7,
                max_output_tokens=2048,
            ),
        )
        return response.text

    return await asyncio.wait_for(_generate(), timeout=timeout)


async def _generate_suggestions(
    session_type: str,
    context_snippet: str,
    last_answer: str,
) -> List[str]:
    """Generate 3 contextual follow-up question chips."""
    model = _get_gemini()
    if not model:
        return []

    prompt = f"""Based on this conversation context about a candidate's profile and this AI answer:

ANSWER: {last_answer[:500]}

Generate exactly 3 short, specific follow-up questions the user might want to ask next.
Session type: {session_type}

Respond as a JSON array of 3 strings. Example:
["What skills should I learn first?", "How does my experience compare?", "What salary should I expect?"]

Only return the JSON array, nothing else."""

    try:
        async def _gen():
            resp = await model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(
                    temperature=0.5,
                    max_output_tokens=200,
                    response_mime_type="application/json",
                ),
            )
            return resp.text

        import google.generativeai as genai
        raw = await asyncio.wait_for(_gen(), timeout=10.0)
        text = raw.strip().strip("```json").strip("```").strip()
        suggestions = json.loads(text)
        if isinstance(suggestions, list):
            return [str(s) for s in suggestions[:3]]
    except Exception as exc:
        logger.warning("suggestions_generation_failed", extra={"error": str(exc)})

    # Fallback suggestions by type
    return _fallback_suggestions(session_type)


def _fallback_suggestions(session_type: str) -> List[str]:
    defaults = {
        "resume_only": [
            "What are my strongest skills?",
            "How can I improve my resume?",
            "What roles am I best suited for?",
        ],
        "job_match": [
            "What skills should I learn to close the gap?",
            "How does my experience compare to requirements?",
            "What's my realistic chance of getting this role?",
        ],
        "interview_prep": [
            "Generate 5 behavioral interview questions",
            "What technical topics should I study?",
            "How should I answer 'Tell me about yourself'?",
        ],
        "career_advice": [
            "What career paths suit my background?",
            "What skills are most valuable for my next role?",
            "How do I transition to a senior position?",
        ],
        "recruiter_review": [
            "Who are the top 3 candidates I should interview?",
            "Draft interview questions for the best candidate",
            "Which candidates have the most potential?",
        ],
    }
    return defaults.get(session_type, [
        "Tell me more about this",
        "What should I focus on?",
        "Give me specific examples",
    ])


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

async def generate_copilot_answer(
    *,
    session_id: str,
    user_message: str,
    context: str,
    session_type: str,
    history: Optional[List[Dict]] = None,
) -> Dict[str, Any]:
    """
    Generate a copilot answer for the given user message.

    Args:
        session_id:    For history management.
        user_message:  The user's question.
        context:       Pre-built context string (resume + job + analysis).
        session_type:  One of the 5 session types.
        history:       Prior conversation turns (optional; loaded internally if None).

    Returns:
        { "answer": str, "suggestions": List[str], "latency_ms": float }
    """
    t0 = time.perf_counter()

    if history is None:
        history = await _get_history(session_id)

    system_prompt = _SYSTEM_PROMPTS.get(session_type, _SYSTEM_PROMPTS["resume_only"])

    try:
        answer = await _call_gemini_chat(
            system_prompt=system_prompt,
            context=context,
            history=history,
            user_message=user_message,
        )
    except Exception as exc:
        logger.error("copilot_generation_failed", extra={"error": str(exc), "session_id": session_id})
        answer = (
            "I'm having trouble connecting to the AI service right now. "
            "Please try again in a moment."
        )

    # Generate follow-up suggestion chips (non-blocking best-effort)
    suggestions = []
    try:
        suggestions = await _generate_suggestions(
            session_type=session_type,
            context_snippet=context[:300],
            last_answer=answer,
        )
    except Exception:
        suggestions = _fallback_suggestions(session_type)

    # Update history
    await _append_history(session_id, {"role": "user", "content": user_message})
    await _append_history(session_id, {"role": "assistant", "content": answer})

    latency_ms = round((time.perf_counter() - t0) * 1000, 1)

    logger.info(
        "copilot_answer_generated",
        extra={
            "session_id": session_id,
            "session_type": session_type,
            "latency_ms": latency_ms,
            "answer_len": len(answer),
        },
    )

    return {
        "answer": answer,
        "suggestions": suggestions,
        "latency_ms": latency_ms,
    }


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def __oid(value: str):
    from bson import ObjectId
    from bson.errors import InvalidId
    try:
        return ObjectId(value)
    except InvalidId:
        return value


def _format_experience(experience: list) -> str:
    if not experience:
        return "Not specified"
    lines = []
    for exp in experience[:6]:   # cap at 6 entries
        if isinstance(exp, dict):
            title   = exp.get("title", exp.get("role", ""))
            company = exp.get("company", "")
            years   = exp.get("duration", exp.get("years", ""))
            desc    = exp.get("description", "")[:200]
            lines.append(f"• {title} @ {company} ({years})\n  {desc}")
        else:
            lines.append(f"• {str(exp)[:200]}")
    return "\n".join(lines)


def _format_education(education: list) -> str:
    if not education:
        return "Not specified"
    lines = []
    for edu in education[:4]:
        if isinstance(edu, dict):
            degree = edu.get("degree", "")
            school = edu.get("institution", edu.get("school", ""))
            year   = edu.get("year", edu.get("graduation_year", ""))
            lines.append(f"• {degree} — {school} ({year})")
        else:
            lines.append(f"• {str(edu)[:150]}")
    return "\n".join(lines)


def _format_salary(job: dict) -> str:
    s_min = job.get("salary_min")
    s_max = job.get("salary_max")
    cur   = job.get("salary_currency", "USD")
    if s_min and s_max:
        return f"{cur} {s_min:,} – {s_max:,}"
    if s_min:
        return f"{cur} {s_min:,}+"
    return "Not disclosed"


def _bullet_list(items: list) -> str:
    if not items:
        return "None listed"
    return "\n".join(f"• {item}" for item in items[:6])
