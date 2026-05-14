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

class ApplicationResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    user_id: str
    job_id: str
    status: str
    match_score: float
    job_role: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class MatchResult(BaseModel):
    match_score: float
    missing_skills: List[str]
    suggestions: List[str]
    strengths: List[str] = []
    weaknesses: List[str] = []
    interview_tips: List[str] = []
    match_breakdown: dict = {"skills": 0, "experience": 0, "education": 0}
    job_role: Optional[str] = None
    status: str = "Applied"



class CandidateRanking(BaseModel):
    user_id: str
    name: str
    match_score: float
    strengths: List[str]
    weaknesses: List[str]
    application_id: str
    status: str

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
