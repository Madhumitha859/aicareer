import os
import json
import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import database, models, schemas, auth, ai_service

router = APIRouter(prefix="/api", tags=["Analysis & Readiness Engine"])

COMPANIES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "companies.json")
RESOURCES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "resources.json")

def load_json_data(filepath: str) -> Dict[str, Any]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return {}

@router.get("/companies")
def get_companies():
    data = load_json_data(COMPANIES_FILE)
    return {"companies": list(data.keys())}

@router.get("/roles/{company}")
def get_roles_for_company(company: str):
    data = load_json_data(COMPANIES_FILE)
    company_data = data.get(company, {})
    roles = list(company_data.keys()) if company_data else [
        "Python Developer",
        "Software Developer",
        "Full Stack Developer",
        "Backend Developer",
        "Frontend Developer",
        "Data Analyst",
        "Data Scientist",
        "Machine Learning Engineer",
        "ServiceNow Developer",
        "Java Developer"
    ]
    return {
        "company": company,
        "roles": roles,
        "requirements": company_data
    }

@router.post("/analysis/run")
def run_analysis(
    payload: schemas.AnalysisRunRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    company = payload.target_company
    role = payload.target_role

    # 1. Fetch user's profile
    profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
    if not profile:
        profile = models.Profile(user_id=current_user.id, skills=["JavaScript", "HTML/CSS", "Git"])
        db.add(profile)
        db.commit()

    candidate_skills = profile.skills or []
    candidate_exp = str(profile.experience) if profile.experience else ""
    candidate_projects = str(profile.projects) if profile.projects else ""
    candidate_edu = str(profile.education) if profile.education else ""

    # Load required skills for company & role
    companies_data = load_json_data(COMPANIES_FILE)
    company_roles = companies_data.get(company, {})
    default_role_skills = {
        "Python Developer": ["Python", "SQL", "REST APIs", "Git", "Flask", "Docker"],
        "Software Developer": ["Java", "SQL", "Git", "Data Structures", "Spring Boot"],
        "Full Stack Developer": ["JavaScript", "HTML/CSS", "React", "Node.js", "Git", "SQL"],
        "Backend Developer": ["Node.js", "Express", "SQL", "REST APIs", "Git", "Docker"],
        "Frontend Developer": ["HTML/CSS", "JavaScript", "React", "Git", "Redux"],
        "Data Analyst": ["SQL", "Excel", "Python", "Tableau", "Power BI"],
        "Data Scientist": ["Python", "SQL", "Statistics", "Machine Learning", "Pandas"],
        "Machine Learning Engineer": ["Python", "TensorFlow", "PyTorch", "Git", "Docker"],
        "ServiceNow Developer": ["JavaScript", "ServiceNow ITSM", "HTML/CSS", "REST APIs"],
        "Java Developer": ["Java", "SQL", "Git", "Spring Boot", "Hibernate"]
    }
    required_skills = company_roles.get(role, default_role_skills.get(role, ["Python", "SQL", "REST APIs", "Git"]))

    # 2. FIXED Weighted Readiness Score Formula
    # Formula: score = (matched_skills / required_skills)*0.4 + experience_match*0.25 + project_relevance*0.25 + certification_match*0.1
    matched_skills = [
        s for s in required_skills 
        if any(cs.lower() in s.lower() or s.lower() in cs.lower() for cs in candidate_skills)
    ]
    skill_match_ratio = len(matched_skills) / len(required_skills) if required_skills else 0.5
    tech_score = skill_match_ratio * 100

    # Experience match: check if years/role mentioned
    exp_score = 60.0
    if any(k in candidate_exp.lower() for k in ["year", "yr", "developer", "engineer", "analyst"]):
        exp_score = 85.0
        if any(k in candidate_exp.lower() for k in ["2", "3", "senior"]):
            exp_score = 95.0

    # Project relevance: count skills present in project description
    project_matches = sum(1 for s in required_skills if s.lower() in candidate_projects.lower())
    proj_score = min(100.0, 65.0 + (project_matches * 10.0))

    # Certification/Education match
    cert_score = 70.0
    edu_keywords = ["degree", "certified", "aws", "bachelor", "master", "diploma", "b.sc", "bsc", "b.com", "bcom", "bca", "mca", "bba", "mba", "b.tech", "btech", "b.e", "be", "b.a", "ba", "graduate"]
    if any(k in candidate_edu.lower() or k in candidate_projects.lower() for k in edu_keywords):
        cert_score = 90.0

    final_score = int(round(
        (tech_score * 0.40) +
        (exp_score * 0.25) +
        (proj_score * 0.25) +
        (cert_score * 0.10)
    ))
    final_score = max(35, min(98, final_score))

    category_scores = {
        "tech": int(round(tech_score)),
        "experience": int(round(exp_score)),
        "projects": int(round(proj_score)),
        "certifications": int(round(cert_score)),
        "alignment": int(round((tech_score + exp_score) / 2))
    }

    # 3. Determine Strengths and Gaps
    strengths = matched_skills
    missing_skills = [s for s in required_skills if s not in matched_skills]

    gaps = []
    for skill in missing_skills:
        priority = "high" if skill in required_skills[:2] else "medium"
        gaps.append({
            "name": skill,
            "priority": priority,
            "explainer": f"Essential skill for {role} at {company}."
        })

    # 4. Call AI Service for Explanation & Reasoning
    ai_response = ai_service.generate_explanation(
        profile={
            "skills": candidate_skills,
            "experience": candidate_exp,
            "education": candidate_edu,
            "projects": candidate_projects
        },
        target_role=role,
        target_company=company,
        score=final_score,
        gaps=gaps
    )

    ai_summary = ai_response.get("summary", "")
    gap_reasons = ai_response.get("gap_reasons", {})
    for g in gaps:
        g["reason"] = gap_reasons.get(g["name"], f"Critical skill for pipeline development in {role}.")

    # 5. Save Analysis to DB & append Score History
    new_analysis = models.Analysis(
        user_id=current_user.id,
        target_company=company,
        target_role=role,
        readiness_score=final_score,
        category_scores=category_scores,
        strengths=strengths,
        gaps=gaps,
        ai_summary=ai_summary
    )
    db.add(new_analysis)
    db.commit()
    db.refresh(new_analysis)

    new_score_history = models.ScoreHistory(
        user_id=current_user.id,
        score=final_score
    )
    db.add(new_score_history)
    db.commit()

    # 6. Build Roadmap
    resources_data = load_json_data(RESOURCES_FILE)
    roadmap = []
    for idx, gap in enumerate(gaps, start=1):
        s_name = gap["name"]
        item_resources = resources_data.get(s_name, [
            {"title": f"Official {s_name} Documentation", "url": "https://developer.mozilla.org"}
        ])
        
        rp = models.RoadmapProgress(
            user_id=current_user.id,
            analysis_id=new_analysis.id,
            skill_name=s_name,
            status="not_started",
            resource_links=item_resources
        )
        db.add(rp)
        db.commit()
        db.refresh(rp)

        roadmap.append({
            "id": rp.id,
            "name": s_name,
            "priority": gap["priority"],
            "status": "not_started",
            "completed": False,
            "resources": item_resources
        })

    return {
        "id": new_analysis.id,
        "target_company": company,
        "target_role": role,
        "readiness_score": final_score,
        "category_scores": category_scores,
        "strengths": strengths,
        "gaps": gaps,
        "ai_summary": ai_summary,
        "created_at": new_analysis.created_at,
        "roadmap": roadmap
    }

@router.get("/analysis/latest")
def get_latest_analysis(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    analysis = db.query(models.Analysis).filter(models.Analysis.user_id == current_user.id).order_by(models.Analysis.created_at.desc()).first()
    if not analysis:
        # Fallback default analysis if none run yet
        return {
            "id": 0,
            "target_company": "Cognizant",
            "target_role": "Python Developer",
            "readiness_score": 68,
            "category_scores": {"tech": 65, "experience": 70, "projects": 70, "certifications": 60, "alignment": 70},
            "strengths": ["Python", "JavaScript", "Git"],
            "gaps": [{"name": "SQL", "priority": "high", "explainer": "Required for database queries."}],
            "ai_summary": "Your profile demonstrates a solid foundation.",
            "created_at": datetime.datetime.utcnow().isoformat(),
            "roadmap": []
        }
    
    # Load roadmap items for this analysis
    roadmap_items = db.query(models.RoadmapProgress).filter(models.RoadmapProgress.analysis_id == analysis.id).all()
    roadmap_data = [{
        "id": item.id,
        "name": item.skill_name,
        "status": item.status,
        "completed": item.status == "completed",
        "resources": item.resource_links or []
    } for item in roadmap_items]

    return {
        "id": analysis.id,
        "target_company": analysis.target_company,
        "target_role": analysis.target_role,
        "readiness_score": analysis.readiness_score,
        "category_scores": analysis.category_scores or {},
        "strengths": analysis.strengths or [],
        "gaps": analysis.gaps or [],
        "ai_summary": analysis.ai_summary,
        "created_at": analysis.created_at,
        "roadmap": roadmap_data
    }
