from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import database, models, schemas, auth

router = APIRouter(prefix="/api/profile", tags=["Profile Management"])

@router.get("", response_model=schemas.ProfileSchema)
def get_user_profile(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        profile = models.Profile(
            user_id=current_user.id,
            skills=["JavaScript", "HTML/CSS", "Git"],
            education="Bachelor of Science",
            projects=[],
            experience=[]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("", response_model=schemas.ProfileSchema)
def update_user_profile(
    payload: schemas.ProfileUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        profile = models.Profile(user_id=current_user.id)
        db.add(profile)

    if payload.skills is not None:
        profile.skills = payload.skills
    if payload.education is not None:
        profile.education = payload.education
    if payload.projects is not None:
        profile.projects = payload.projects
    if payload.experience is not None:
        profile.experience = payload.experience

    db.commit()
    db.refresh(profile)
    return profile

@router.get("/all-db-data")
def get_all_db_data(db: Session = Depends(database.get_db)):
    users = db.query(models.User).all()
    profiles = db.query(models.Profile).all()
    analyses = db.query(models.Analysis).all()
    return {
        "users": [{"id": u.id, "name": u.name, "email": u.email, "created_at": str(u.created_at)} for u in users],
        "profiles": [{"id": p.id, "user_id": p.user_id, "skills": p.skills, "education": p.education, "projects": p.projects, "experience": p.experience, "updated_at": str(p.updated_at)} for p in profiles],
        "analyses": [{"id": a.id, "user_id": a.user_id, "target_company": a.target_company, "target_role": a.target_role, "readiness_score": a.readiness_score, "created_at": str(a.created_at)} for a in analyses]
    }
