from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

# --- Auth Schemas ---
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# --- Profile Schemas ---
class ProfileSchema(BaseModel):
    skills: List[str] = []
    education: Any = {}
    projects: List[Any] = []
    experience: Any = []

    class Config:
        from_attributes = True

class ProfileUpdate(BaseModel):
    skills: Optional[List[str]] = None
    education: Optional[Any] = None
    projects: Optional[List[Any]] = None
    experience: Optional[Any] = None

# --- Analysis Schemas ---
class AnalysisRunRequest(BaseModel):
    target_company: str
    target_role: str
    job_description_text: Optional[str] = None
    candidate_skills: Optional[List[str]] = None
    candidate_experience: Optional[str] = None
    candidate_education: Optional[str] = None
    candidate_projects: Optional[str] = None

class JobRequirementRequest(BaseModel):
    company: str
    role: str
    job_description_text: Optional[str] = None

class GapItem(BaseModel):
    name: str
    priority: str  # high, medium, low
    explainer: str
    reason: Optional[str] = None

class AnalysisOut(BaseModel):
    id: int
    target_company: str
    target_role: str
    readiness_score: int
    category_scores: Dict[str, int]
    strengths: List[str]
    gaps: List[Dict[str, Any]]
    ai_summary: Optional[str]
    created_at: datetime
    roadmap: List[Dict[str, Any]] = []
    requirement_source: Optional[str] = None
    requirement_label: Optional[str] = None

    class Config:
        from_attributes = True

# --- Roadmap & Progress Schemas ---
class RoadmapUpdateStatus(BaseModel):
    status: str # not_started, in_progress, completed

class ScoreHistoryOut(BaseModel):
    id: int
    score: int
    recorded_at: datetime

    class Config:
        from_attributes = True
