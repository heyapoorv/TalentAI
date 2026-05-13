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

class JobCreate(BaseModel):
    role: str
    description: str
    skills: List[str]
    company: Optional[str] = "Global Tech"
    status: Optional[str] = "Active"

class JobResponse(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    recruiter_id: str
    role: str
    company: Optional[str] = "Global Tech"
    status: Optional[str] = "Active"
    description: str
    skills: List[str]
    applicant_count: Optional[int] = 0
    top_match_score: Optional[float] = 0.0
    created_at: Optional[datetime] = None
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        from_attributes = True

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
