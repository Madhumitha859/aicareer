import os
import json
import datetime
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import database, models, schemas, auth, ai_service, job_service

router = APIRouter(prefix="/api", tags=["Analysis & Readiness Engine"])

logger = logging.getLogger(__name__)

COMPANIES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "companies.json")
RESOURCES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "resources.json")

def load_json_data(filepath: str) -> Dict[str, Any]:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        return {}


# ──────────────────────────────────────────────────────────────
#  SUGGESTION ENDPOINTS (auto-complete helpers — NOT restrictive)
# ──────────────────────────────────────────────────────────────

@router.get("/companies")
def get_companies():
    """Return popular company names as auto-complete SUGGESTIONS only.
    Users can type ANY company — this is not a restrictive list."""
    data = load_json_data(COMPANIES_FILE)
    return {"companies": list(data.keys())}


@router.get("/roles/{company}")
def get_roles_for_company(company: str):
    """Return popular role suggestions. Users can type ANY role freely."""
    data = load_json_data(COMPANIES_FILE)
    company_data = data.get(company, {})
    # If the company has predefined roles, suggest them.
    # Otherwise suggest common roles across ALL streams (not just IT).
    roles = list(company_data.keys()) if company_data else [
        # Tech roles
        "Python Developer",
        "Software Developer",
        "Full Stack Developer",
        "Backend Developer",
        "Frontend Developer",
        "Data Analyst",
        "Data Scientist",
        "Machine Learning Engineer",
        "ServiceNow Developer",
        "Java Developer",
        "DevOps Engineer",
        "Cloud Engineer",
        # Business & Management roles
        "Business Analyst",
        "Management Consultant",
        "Marketing Manager",
        "Product Manager",
        "Project Manager",
        "Financial Analyst",
        "HR Executive",
        "Operations Manager",
        # Other streams
        "Content Writer",
        "Graphic Designer",
        "UI/UX Designer",
        "Sales Executive",
        "Account Manager",
        "Research Analyst",
        "Quality Analyst",
        "Network Engineer",
        "Database Administrator",
        "Cyber Security Analyst"
    ]
    return {
        "company": company,
        "roles": roles,
        "is_suggestion": True  # Signal to frontend that these are suggestions, not restrictions
    }


# ──────────────────────────────────────────────────────────────
#  CORE ANALYSIS ENGINE — supports ANY company + ANY role
# ──────────────────────────────────────────────────────────────

def resolve_job_requirements(company: str, role: str, user_jd_text: str = None) -> Dict[str, Any]:
    """
    3-tier grounded requirement resolution:
      Tier 1: Live external Job API (real postings)
      Tier 2: User-supplied job description text
      Tier 3: Identifiable industry-standard benchmark for the role

    AI is NEVER allowed to invent company-specific requirements.
    All skills must come from real job data or identifiable benchmarks.
    """

    jd_text = None
    source_type = "industry_benchmark"

    # ── Tier 1: Try external Job API for real job posting ──
    if not user_jd_text:
        try:
            api_result = job_service.fetch_external_job_requirements(company, role)
            if api_result and api_result.get("job_description"):
                jd_text = api_result["job_description"]
                source_type = "live_job_api"
                logger.info(f"Tier 1 hit: Found live job posting for '{role}' at '{company}'")
        except Exception as e:
            logger.warning(f"External Job API error: {e}")

    # ── Tier 2: User-supplied job description ──
    if not jd_text and user_jd_text and len(user_jd_text.strip()) >= 30:
        jd_text = user_jd_text.strip()
        source_type = "user_supplied"
        logger.info(f"Tier 2: Using user-supplied job description for '{role}' at '{company}'")

    # ── Tier 3 will be handled inside extract_job_requirements when jd_text is None/empty ──
    if not jd_text:
        logger.info(f"Tier 3: Using industry benchmark for '{role}' (no live posting or user JD)")

    # Extract structured requirements from whatever text we have (or benchmark fallback)
    requirements = ai_service.extract_job_requirements(jd_text, company, role, source_type)
    return requirements


@router.post("/analysis/run")
def run_analysis(
    payload: schemas.AnalysisRunRequest,
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(database.get_db)
):
    company = payload.target_company.strip()
    role = payload.target_role.strip()
    user_jd_text = payload.job_description_text

    if not company or not role:
        raise HTTPException(status_code=400, detail="Company and role are required.")

    # 1. Fetch user's profile or payload data
    candidate_skills = []
    candidate_exp = ""
    candidate_projects = ""
    candidate_edu = ""

    if current_user:
        profile = db.query(models.Profile).filter(models.Profile.user_id == current_user.id).first()
        if not profile:
            profile = models.Profile(user_id=current_user.id, skills=[])
            db.add(profile)
            db.commit()
        if payload.candidate_skills:
            profile.skills = payload.candidate_skills
            db.commit()
        candidate_skills = profile.skills or []
        candidate_exp = str(profile.experience) if profile.experience else ""
        candidate_projects = str(profile.projects) if profile.projects else ""
        candidate_edu = str(profile.education) if profile.education else ""

    # Override/supplement with payload data if provided
    if payload.candidate_skills:
        candidate_skills = payload.candidate_skills
    if payload.candidate_experience:
        candidate_exp = payload.candidate_experience
    if payload.candidate_education:
        candidate_edu = payload.candidate_education
    if payload.candidate_projects:
        candidate_projects = payload.candidate_projects

    # 2. Dynamically resolve job requirements (3-tier grounded hierarchy)
    requirements = resolve_job_requirements(company, role, user_jd_text)

    required_skills = requirements.get("required_skills", ["Problem Solving", "Communication"])
    preferred_skills = requirements.get("preferred_skills", [])
    experience_required = requirements.get("experience_required", "")
    education_required = requirements.get("education_required", "")
    requirement_source = requirements.get("source", "industry_benchmark")
    requirement_label = requirements.get("source_label", "Industry Standard Benchmark")
    raw_snippet = requirements.get("raw_snippet", "")

    # 3. WEIGHTED READINESS SCORE CALCULATION
    # Skills match (40%)
    matched_skills = [
        s for s in required_skills
        if any(cs.lower() in s.lower() or s.lower() in cs.lower() for cs in candidate_skills)
    ]
    skill_match_ratio = len(matched_skills) / len(required_skills) if required_skills else 0.5
    tech_score = skill_match_ratio * 100

    # Preferred skills bonus — check how many preferred skills the candidate has
    preferred_matched = [
        s for s in preferred_skills
        if any(cs.lower() in s.lower() or s.lower() in cs.lower() for cs in candidate_skills)
    ]

    # Experience match (25%)
    exp_score = 60.0
    if any(k in candidate_exp.lower() for k in ["year", "yr", "developer", "engineer", "analyst",
                                                   "manager", "consultant", "executive", "intern"]):
        exp_score = 85.0
        if any(k in candidate_exp.lower() for k in ["2", "3", "senior", "lead"]):
            exp_score = 95.0

    # Project relevance (25%)
    all_target_skills = required_skills + preferred_skills
    project_matches = sum(1 for s in all_target_skills if s.lower() in candidate_projects.lower())
    proj_score = min(100.0, 65.0 + (project_matches * 8.0))

    # Education match (10%)
    cert_score = 70.0
    edu_keywords = [
        "degree", "certified", "aws", "bachelor", "master", "diploma",
        "b.sc", "bsc", "b.com", "bcom", "bca", "mca", "bba", "mba",
        "b.tech", "btech", "b.e", "be", "b.a", "ba", "graduate",
        "mcs", "m.sc", "msc", "pgdm", "phd", "university", "college",
        "institute", "engineering", "management", "commerce", "arts", "science"
    ]
    if any(k in candidate_edu.lower() or k in candidate_projects.lower() for k in edu_keywords):
        cert_score = 90.0

    # Check education alignment with required education
    if education_required:
        edu_req_lower = education_required.lower()
        candidate_edu_lower = candidate_edu.lower()
        if any(k in candidate_edu_lower for k in edu_req_lower.split() if len(k) > 3):
            cert_score = min(100.0, cert_score + 5.0)

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

    # 4. Determine Strengths and Gaps
    strengths = matched_skills + preferred_matched
    missing_skills = [s for s in required_skills if s not in matched_skills]

    gaps = []
    for idx, skill in enumerate(missing_skills):
        priority = "high" if idx < max(2, len(missing_skills) // 3) else "medium"
        gaps.append({
            "name": skill,
            "priority": priority,
            "explainer": f"Required skill for {role} positions at {company}."
        })
    # Add missing preferred skills as low/medium priority
    missing_preferred = [s for s in preferred_skills if s not in preferred_matched and s not in missing_skills]
    for skill in missing_preferred[:4]:
        gaps.append({
            "name": skill,
            "priority": "low",
            "explainer": f"Preferred skill that strengthens your candidacy for {role} at {company}."
        })

    # 5. Call AI Service for Explanation & Reasoning
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
        g["reason"] = gap_reasons.get(g["name"], f"Important skill for {role} positions.")

    # 6. Save Analysis to DB & append Score History if user is authenticated
    analysis_id = 0
    created_at_str = datetime.datetime.utcnow().isoformat()
    if current_user:
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
        analysis_id = new_analysis.id
        created_at_str = new_analysis.created_at.isoformat() if hasattr(new_analysis.created_at, "isoformat") else str(new_analysis.created_at)

        new_score_history = models.ScoreHistory(
            user_id=current_user.id,
            score=final_score
        )
        db.add(new_score_history)
        db.commit()

    # 7. Build Roadmap
    resources_data = load_json_data(RESOURCES_FILE)
    roadmap = []
    for idx, gap in enumerate(gaps, start=1):
        s_name = gap["name"]
        item_resources = resources_data.get(s_name, [
            {"title": f"Learn {s_name} — Guides & Tutorials", "url": f"https://www.google.com/search?q=learn+{s_name.replace(' ', '+')}+tutorial"}
        ])

        roadmap_id = idx
        if current_user and analysis_id:
            rp = models.RoadmapProgress(
                user_id=current_user.id,
                analysis_id=analysis_id,
                skill_name=s_name,
                status="not_started",
                resource_links=item_resources
            )
            db.add(rp)
            db.commit()
            db.refresh(rp)
            roadmap_id = rp.id

        roadmap.append({
            "id": roadmap_id,
            "name": s_name,
            "priority": gap["priority"],
            "status": "not_started",
            "completed": False,
            "resources": item_resources
        })

    return {
        "id": analysis_id,
        "target_company": company,
        "target_role": role,
        "readiness_score": final_score,
        "category_scores": category_scores,
        "strengths": strengths,
        "gaps": gaps,
        "ai_summary": ai_summary,
        "created_at": created_at_str,
        "roadmap": roadmap,
        "requirement_source": requirement_source,
        "requirement_label": requirement_label,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "experience_required": experience_required,
        "education_required": education_required,
        "raw_snippet": raw_snippet[:300] if raw_snippet else ""
    }


@router.get("/analysis/latest")
def get_latest_analysis(
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
    db: Session = Depends(database.get_db)
):
    if not current_user:
        return {
            "id": 0,
            "target_company": "",
            "target_role": "",
            "readiness_score": 0,
            "category_scores": {"tech": 0, "experience": 0, "projects": 0, "certifications": 0, "alignment": 0},
            "strengths": [],
            "gaps": [],
            "ai_summary": "No analysis has been run yet. Upload your resume and select a target company and role to get started.",
            "created_at": datetime.datetime.utcnow().isoformat(),
            "roadmap": [],
            "requirement_source": "",
            "requirement_label": ""
        }

    analysis = db.query(models.Analysis).filter(models.Analysis.user_id == current_user.id).order_by(models.Analysis.created_at.desc()).first()
    if not analysis:
        # Fallback default analysis if none run yet
        return {
            "id": 0,
            "target_company": "",
            "target_role": "",
            "readiness_score": 0,
            "category_scores": {"tech": 0, "experience": 0, "projects": 0, "certifications": 0, "alignment": 0},
            "strengths": [],
            "gaps": [],
            "ai_summary": "No analysis has been run yet. Upload your resume and select a target company and role to get started.",
            "created_at": datetime.datetime.utcnow().isoformat(),
            "roadmap": [],
            "requirement_source": "",
            "requirement_label": ""
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
        "created_at": analysis.created_at.isoformat() if hasattr(analysis.created_at, "isoformat") else str(analysis.created_at),
        "roadmap": roadmap_data,
        "requirement_source": "",
        "requirement_label": ""
    }
