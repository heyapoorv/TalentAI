from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional, Any
from datetime import datetime
from bson import ObjectId
from typing_extensions import Annotated

# Custom type for handling MongoDB ObjectIds in Pydantic
PyObjectId = Annotated[str, BeforeValidator(str)]

class UserBase(BaseModel):
    name: str
    email: str
    role: str
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    portfolio_url: Optional[str] = None
    photo_url: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., max_length=72)

class UserResponse(UserBase):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class UserUpdateRequest(BaseModel):
    """Strictly typed schema for profile update — prevents NoSQL injection via raw dict."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, strip_whitespace=True)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    portfolio_url: Optional[str] = Field(None, max_length=200)
    photo_url: Optional[str] = Field(None, max_length=500)

    class Config:
        extra = "forbid"

class JobCreate(BaseModel):
    role: str
    description: str
    skills: List[str]
    company: Optional[str] = "Global Tech"
    status: Optional[str] = "Active"
    # New filterable fields
    location: Optional[str] = None           # e.g. "Remote", "New York", "Hybrid"
    job_type: Optional[str] = None           # "full-time", "part-time", "contract", "internship"
    experience_level: Optional[str] = None   # "entry", "mid", "senior", "lead"
    salary_min: Optional[int] = None         # e.g. 50000
    salary_max: Optional[int] = None         # e.g. 120000
    salary_currency: Optional[str] = "USD"

class JobResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    recruiter_id: str
    role: str
    company: Optional[str] = "Global Tech"
    status: Optional[str] = "Active"
    description: str
    skills: List[str]
    location: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: Optional[str] = "USD"
    applicant_count: Optional[int] = 0
    top_match_score: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        from_attributes = True

class PaginatedJobResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ApplicationCreate(BaseModel):
    job_id: str

class ApplicationStatusUpdate(BaseModel):
    status: str

class HiringRecommendation(BaseModel):
    recommendation: str  # "Strong Yes", "Yes", "Maybe", "No"
    confidence: int      # 0-100
    reasons: List[str]
    risks: List[str]
    interview_focus: List[str]

class RankingExplanationResponse(BaseModel):
    application_id: str
    rank_rationale: str
    satisfied_requirements: List[str]
    missing_requirements: List[str]

class ApplicationResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    job_id: str
    status: str
    match_score: float
    job_role: Optional[str] = None
    created_at: datetime
    hiring_recommendation: Optional[HiringRecommendation] = None
    ranking_explanation: Optional[RankingExplanationResponse] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class CandidateComparisonRequest(BaseModel):
    application_ids: List[str]

class CandidateComparisonResponse(BaseModel):
    best_overall_id: str
    best_technical_id: str
    fastest_ramp_up_id: str
    highest_risk_id: str
    comparison_table: List[dict]  # e.g., [{"category": "Technical", "candidate_1": "Strong", "candidate_2": "Weak"}]
    hiring_recommendation: str

class ScorecardCriteria(BaseModel):
    category: str
    question: str
    expected_answer: str
    max_score: int

class InterviewScorecardResponse(BaseModel):
    application_id: str
    job_id: str
    criteria: List[ScorecardCriteria]
    overall_guidance: str

class MatchResult(BaseModel):
    match_score: float
    missing_skills: List[str]
    suggestions: List[str]
    strengths: List[str] = []
    weaknesses: List[str] = []
    interview_tips: List[str] = []
    match_breakdown: dict = {"skills": 0, "experience": 0, "education": 0}
    job_role: Optional[str] = None
    status: Optional[str] = None
class CitationSource(BaseModel):
    document_id: str
    filename: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    chunk_text: Optional[str] = None


class CandidateRanking(BaseModel):
    user_id: str
    name: str
    match_score: float
    strengths: List[str]
    weaknesses: List[str]
    application_id: str
    status: str

class BulletEnhancement(BaseModel):
    original: str
    improved: str

class ResumeOptimizationResponse(BaseModel):
    ats_score: int
    scoring_breakdown: dict
    missing_keywords: List[str]
    important_keywords: List[str]
    recommended_additions: List[str]
    original_summary: str
    improved_summary: str
    job_specific_summary: str
    bullet_enhancements: List[BulletEnhancement]
    quick_wins: List[str]
    medium_term_improvements: List[str]
    high_impact_skill_additions: List[str]

class ResumeOptimizationRequest(BaseModel):
    job_description: str
    
class ScorecardEvaluationSaveRequest(BaseModel):
    scores: dict
    notes: Optional[str] = None
    total_score: int
    max_possible: int

class NotificationResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    title: str
    message: str
    type: str # 'info', 'success', 'warning'
    is_read: bool = False
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ── Copilot Chat schemas ──────────────────────────────────────────────────────

class CopilotSessionCreate(BaseModel):
    """Create a new Copilot chat session."""
    name: Optional[str] = None
    session_type: str = "resume_only"
    # session_type: "resume_only" | "job_match" | "interview_prep" | "career_advice" | "recruiter_review"
    resume_id: Optional[str] = None   # candidate: auto-resolved if omitted
    job_id: Optional[str] = None      # required for job_match / interview_prep


class CopilotSessionResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    name: str
    session_type: str
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime
    copilot_version: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class CopilotMessageCreate(BaseModel):
    message: str


class CopilotMessageResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    session_id: str
    role: str                           # "user" | "assistant"
    content: str
    suggestions: Optional[List[str]] = None   # follow-up question chips
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


# ── RAG / Document Platform schemas (used by document_routes + chat_routes) ──

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    name: str
    description: Optional[str] = None
    owner_id: str
    org_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class CollectionCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    workspace_id: str
    name: str
    description: Optional[str] = None
    doc_count: int = 0
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class DocumentResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    workspace_id: str
    collection_id: str
    filename: str
    status: str = "pending"
    doc_type: Optional[str] = None
    version: int = 1
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class IngestResponse(BaseModel):
    document_id: str
    status: str
    message: str


class SearchRequest(BaseModel):
    query: str
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    top_k: int = 6


class SearchResultItem(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    text: str
    score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]
    retrieval_mode: str = "hybrid"


class ChatSessionCreate(BaseModel):
    name: Optional[str] = None
    scope: str = "workspace"
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None


class ChatSessionResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    workspace_id: str
    name: str
    scope: str
    collection_id: Optional[str] = None
    document_ids: Optional[List[str]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}


class ChatMessageCreate(BaseModel):
    message: str


class RAGAnswerResponse(BaseModel):
    answer: str
    citations: Optional[List[CitationSource]] = None
    confidence: Optional[float] = None
    support_status: Optional[str] = None
    latency_ms: Optional[float] = None


class ChatMessageResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    session_id: str
    role: str
    content: str
    rag_answer: Optional[RAGAnswerResponse] = None
    created_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

# ── Admin & Observability schemas ─────────────────────────────────────────────

class VersionConfig(BaseModel):
    parser_version: str
    embedding_version: str
    analysis_version: str
    copilot_version: str
    model_version: str
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None

class VersionUpdate(BaseModel):
    new_version: str

class ReprocessingJobCreate(BaseModel):
    all: bool = False
    item_ids: Optional[List[str]] = None

class ReprocessingJobResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    type: str
    status: str
    total: int = 0
    processed: int = 0
    failed: int = 0
    errors: Optional[List[dict]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class MetricsSummary(BaseModel):
    since_hours: int
    generated_at: str
    requests: dict
    gemini: dict
    cache: dict
    errors: dict
    timeseries: List[dict]
    top_endpoints: List[dict]
    recent_errors: List[dict]
    active_users: int
