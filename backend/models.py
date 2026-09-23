import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="user", cascade="all, delete-orphan")
    roadmap_items = relationship("RoadmapProgress", back_populates="user", cascade="all, delete-orphan")
    score_history = relationship("ScoreHistory", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    skills = Column(JSON, default=list)
    education = Column(JSON, default=dict)
    projects = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_company = Column(String(100), nullable=False)
    target_role = Column(String(100), nullable=False)
    readiness_score = Column(Integer, nullable=False)
    category_scores = Column(JSON, default=dict)
    strengths = Column(JSON, default=list)
    gaps = Column(JSON, default=list)
    ai_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="analyses")
    roadmap_items = relationship("RoadmapProgress", back_populates="analysis", cascade="all, delete-orphan")


class RoadmapProgress(Base):
    __tablename__ = "roadmap_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(Integer, ForeignKey("analyses.id"), nullable=True)
    skill_name = Column(String(100), nullable=False)
    status = Column(String(50), default="not_started") # not_started, in_progress, completed
    resource_links = Column(JSON, default=list)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="roadmap_items")
    analysis = relationship("Analysis", back_populates="roadmap_items")


class ScoreHistory(Base):
    __tablename__ = "score_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Integer, nullable=False)
    recorded_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="score_history")
