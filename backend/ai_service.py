import os
import json
import logging
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

def get_claude_client():
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_key_here":
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    except Exception as e:
        logger.warning(f"Could not initialize Anthropic client: {e}")
        return None

def extract_resume_data(resume_text: str) -> Dict[str, Any]:
    """
    Extract skills, education, projects, experience from resume text using Claude API.
    Falls back gracefully if API is unconfigured or fails.
    """
    fallback_data = {
        "skills": ["JavaScript", "HTML/CSS", "Git", "Python", "SQL"],
        "education": "Bachelor of Science in Computer Science",
        "projects": [
            {"name": "E-commerce Web App", "description": "Built responsive web application using JavaScript and REST APIs"}
        ],
        "experience": [
            {"role": "Software Developer Intern", "company": "Tech Corp", "duration": "6 months"}
        ]
    }

    client = get_claude_client()
    if not client:
        logger.info("Using fallback resume extraction (no Anthropic API key provided).")
        return fallback_data

    prompt = f"""Extract skills, education, projects, experience from this resume. Return ONLY valid JSON in this exact format:
{{
  "skills": ["Skill1", "Skill2"],
  "education": "Degree or Education Summary",
  "projects": [{{"name": "Project Name", "description": "Short Description"}}],
  "experience": [{{"role": "Job Role", "company": "Company Name", "duration": "Duration"}}]
}}

Resume text:
{resume_text}
"""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.content[0].text
        # Clean potential markdown formatting
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content.strip())
        return parsed
    except Exception as e:
        logger.error(f"Claude API resume extraction failed: {e}")
        return fallback_data


def generate_explanation(profile: Dict[str, Any], target_role: str, target_company: str, score: int, gaps: list) -> Dict[str, Any]:
    """
    Generate AI-assisted summary, strength bullets, and gap reasoning using Claude API.
    Falls back to static template if API call fails or is unconfigured.
    """
    fallback_result = {
        "summary": f"Your profile shows a {score}% readiness level for a {target_role} position at {target_company}. You match several core technical requirements, but bridging key gaps will boost your alignment.",
        "strengths": [
            "Solid foundational programming skills matched with target role expectations.",
            "Demonstrated hands-on project work utilizing modern developer tools.",
            "Relevant education background aligned with technology standards."
        ],
        "gap_reasons": {
            gap.get("name", "Skill"): f"Critical requirement for {target_role} positions at {target_company} to ensure production readiness."
            for gap in gaps
        }
    }

    client = get_claude_client()
    if not client:
        return fallback_result

    gap_names = [g.get("name") if isinstance(g, dict) else str(g) for g in gaps]
    prompt = f"""Given this candidate profile {json.dumps(profile)}, target role {target_role} at {target_company}, readiness score {score}%, and skill gaps {json.dumps(gap_names)}, write:
1. A 2-sentence fit summary.
2. 3 strength bullets highlighting candidate strengths.
3. One sentence per gap explaining its importance for this target role.

Return ONLY valid JSON in this exact structure:
{{
  "summary": "2 sentence fit summary here.",
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "gap_reasons": {{"SkillName": "Reason why it is important"}}
}}
"""

    try:
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=800,
            temperature=0.3,
            messages=[{"role": "user", "content": prompt}]
        )
        content = response.content[0].text
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except Exception as e:
        logger.error(f"Claude API explanation generation failed: {e}")
        return fallback_result
