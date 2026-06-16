"""
api/copilot_routes.py

TalentAI-native AI Copilot REST API.

Endpoints:
  POST   /copilot/sessions                  → create session
  GET    /copilot/sessions                  → list user's sessions
  DELETE /copilot/sessions/{id}             → delete session + history
  POST   /copilot/sessions/{id}/messages    → send message → AI answer
  GET    /copilot/sessions/{id}/messages    → list message history

Session types:
  resume_only     → candidate asks about their resume
  job_match       → compare resume vs a specific job
  interview_prep  → targeted interview prep based on match analysis
  career_advice   → broader career guidance
  recruiter_review → recruiter reviews applicant pool for a job
"""

from __future__ import annotations

import datetime
import logging
from typing import List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from db.database import get_db
from models.schemas import (
    CopilotMessageCreate,
    CopilotMessageResponse,
    CopilotSessionCreate,
    CopilotSessionResponse,
)
from services.auth import get_current_user
from services.copilot import (
    build_candidate_context,
    build_recruiter_context,
    clear_copilot_history,
    generate_copilot_answer,
)

logger = logging.getLogger("talentai.copilot_routes")
router = APIRouter()

VALID_SESSION_TYPES = {
    "resume_only",
    "job_match",
    "interview_prep",
    "career_advice",
    "recruiter_review",
}


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _oid(value: str, label: str = "ID") -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId:
        raise HTTPException(400, detail=f"Invalid {label} format.")


async def _get_session(session_id: str, user_id: str, db) -> dict:
    sess = await db.copilot_sessions.find_one({"_id": _oid(session_id, "session ID")})
    if not sess:
        raise HTTPException(404, detail="Copilot session not found.")
    if sess.get("user_id") != user_id:
        raise HTTPException(403, detail="Access denied to this session.")
    return sess


def _session_label(session_type: str, resume_id: Optional[str], job_id: Optional[str]) -> str:
    labels = {
        "resume_only": "Resume Review",
        "job_match": "Job Match Analysis",
        "interview_prep": "Interview Prep",
        "career_advice": "Career Advice",
        "recruiter_review": "Candidate Review",
    }
    return labels.get(session_type, "AI Chat")


# ══════════════════════════════════════════════════════════════════════════════
# SESSIONS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/sessions", response_model=CopilotSessionResponse, status_code=201)
async def create_session(
    payload: CopilotSessionCreate,
    db=Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create a new Copilot chat session."""
    user_id   = str(user["_id"])
    user_role = user.get("role", "candidate")

    session_type = payload.session_type
    if session_type not in VALID_SESSION_TYPES:
        raise HTTPException(400, detail=f"Invalid session_type. Must be one of: {', '.join(VALID_SESSION_TYPES)}")

    # Recruiters can only use recruiter_review
    if user_role == "recruiter" and session_type != "recruiter_review":
        session_type = "recruiter_review"

    # Candidates can't use recruiter_review
    if user_role == "candidate" and session_type == "recruiter_review":
        raise HTTPException(403, detail="Recruiter session type is not available for candidates.")

    # Auto-resolve resume_id for candidates
    resume_id = payload.resume_id
    if not resume_id and user_role == "candidate":
        latest = await db.resumes.find_one(
            {"user_id": user_id},
            sort=[("created_at", -1)],
        )
        resume_id = str(latest["_id"]) if latest else None

    now  = datetime.datetime.utcnow()
    name = payload.name or _session_label(session_type, resume_id, payload.job_id)
    name = f"{name} — {now.strftime('%b %d, %H:%M')}"

    from services.versioning import get_version_stamp
    stamp = await get_version_stamp(["copilot_version"], db=db)

    doc = {
        "user_id": user_id,
        "name": name,
        "session_type": session_type,
        "resume_id": resume_id,
        "job_id": payload.job_id,
        "message_count": 0,
        "created_at": now,
        "updated_at": now,
        **stamp,
    }
    result = await db.copilot_sessions.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


@router.get("/sessions", response_model=List[CopilotSessionResponse])
async def list_sessions(
    db=Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all Copilot sessions for the current user."""
    sessions = await db.copilot_sessions.find(
        {"user_id": str(user["_id"])}
    ).sort("updated_at", -1).to_list(50)
    return sessions


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: str,
    db=Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Delete a session and all its messages."""
    sess = await _get_session(session_id, str(user["_id"]), db)
    await db.copilot_sessions.delete_one({"_id": sess["_id"]})
    await db.copilot_messages.delete_many({"session_id": session_id})
    await clear_copilot_history(session_id)


# ══════════════════════════════════════════════════════════════════════════════
# MESSAGES  (the core Copilot loop)
# ══════════════════════════════════════════════════════════════════════════════

@router.post(
    "/sessions/{session_id}/messages",
    response_model=CopilotMessageResponse,
)
async def send_message(
    session_id: str,
    payload: CopilotMessageCreate,
    db=Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Send a message to the Copilot and receive a grounded AI answer.
    
    The Copilot automatically loads the candidate's resume, job description,
    and AI match analysis as context before generating the answer.
    """
    user_id = str(user["_id"])
    sess    = await _get_session(session_id, user_id, db)

    question     = payload.message.strip()
    session_type = sess.get("session_type", "resume_only")
    resume_id    = sess.get("resume_id")
    job_id       = sess.get("job_id")

    if not question:
        raise HTTPException(400, detail="Message cannot be empty.")

    # ── 1. Persist user message ────────────────────────────────────────────
    now = datetime.datetime.utcnow()
    user_msg = {
        "session_id": session_id,
        "user_id": user_id,
        "role": "user",
        "content": question,
        "suggestions": None,
        "created_at": now,
    }
    await db.copilot_messages.insert_one(user_msg)

    # ── 2. Build context ───────────────────────────────────────────────────
    if session_type == "recruiter_review":
        if not job_id:
            raise HTTPException(400, detail="job_id is required for recruiter_review sessions.")
        context = await build_recruiter_context(job_id, db)
    else:
        resume_ctx, job_ctx, analysis_ctx = await build_candidate_context(
            resume_id=resume_id,
            job_id=job_id,
            user_id=user_id,
            db=db,
        )
        parts = [p for p in [resume_ctx, job_ctx, analysis_ctx] if p]
        context = "\n\n".join(parts)

    # ── 3. Generate answer ─────────────────────────────────────────────────
    result = await generate_copilot_answer(
        session_id=session_id,
        user_message=question,
        context=context,
        session_type=session_type,
    )

    # ── 4. Persist assistant message ───────────────────────────────────────
    asst_now = datetime.datetime.utcnow()
    asst_msg = {
        "session_id": session_id,
        "user_id": user_id,
        "role": "assistant",
        "content": result["answer"],
        "suggestions": result.get("suggestions", []),
        "created_at": asst_now,
    }
    msg_result = await db.copilot_messages.insert_one(asst_msg)
    asst_msg["_id"] = msg_result.inserted_id

    # ── 5. Update session metadata ─────────────────────────────────────────
    await db.copilot_sessions.update_one(
        {"_id": sess["_id"]},
        {
            "$set": {"updated_at": asst_now},
            "$inc": {"message_count": 2},   # user + assistant
        },
    )

    logger.info(
        "copilot_message_sent",
        extra={
            "session_id": session_id,
            "session_type": session_type,
            "latency_ms": result.get("latency_ms"),
        },
    )

    return asst_msg


@router.get(
    "/sessions/{session_id}/messages",
    response_model=List[CopilotMessageResponse],
)
async def list_messages(
    session_id: str,
    limit: int = 100,
    db=Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Retrieve the full message history for a session."""
    await _get_session(session_id, str(user["_id"]), db)

    messages = await db.copilot_messages.find(
        {"session_id": session_id}
    ).sort("created_at", 1).limit(limit).to_list(limit)

    return messages
