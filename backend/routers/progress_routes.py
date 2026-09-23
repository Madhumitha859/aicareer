import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import database, models, schemas, auth

router = APIRouter(prefix="/api/progress", tags=["Progress & Roadmap Tracking"])

@router.get("/history")
def get_score_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    entries = db.query(models.ScoreHistory).filter(models.ScoreHistory.user_id == current_user.id).order_by(models.ScoreHistory.recorded_at.asc()).all()
    
    if not entries:
        # Initial baseline if none exists
        default_entry = models.ScoreHistory(user_id=current_user.id, score=62)
        db.add(default_entry)
        db.commit()
        db.refresh(default_entry)
        entries = [default_entry]

    return [{
        "id": entry.id,
        "score": entry.score,
        "recorded_at": entry.recorded_at,
        "date": entry.recorded_at.strftime("%b %d, %H:%M")
    } for entry in entries]

@router.put("/roadmap/{skill_id}")
def update_roadmap_skill_status(
    skill_id: int,
    payload: schemas.RoadmapUpdateStatus,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    item = db.query(models.RoadmapProgress).filter(
        models.RoadmapProgress.id == skill_id,
        models.RoadmapProgress.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Roadmap skill item not found")

    item.status = payload.status
    if payload.status == "completed":
        item.completed_at = datetime.datetime.utcnow()
        
        # Add newly mastered skill to user profile
        profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
        if profile:
            skills = list(profile.skills or [])
            if item.skill_name not in skills:
                skills.append(item.skill_name)
                profile.skills = skills
                db.commit()

        # Recalculate and append new score boost
        latest_history = db.query(models.ScoreHistory).filter(models.ScoreHistory.user_id == current_user.id).order_by(models.ScoreHistory.recorded_at.desc()).first()
        current_score = latest_history.score if latest_history else 65
        new_score = min(98, current_score + 5)

        new_history = models.ScoreHistory(
            user_id=current_user.id,
            score=new_score
        )
        db.add(new_history)

    db.commit()
    db.refresh(item)

    return {
        "id": item.id,
        "skill_name": item.skill_name,
        "status": item.status,
        "message": f"Skill status updated to {item.status}"
    }
