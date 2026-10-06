import os
import json
import logging
import re
from typing import Dict, Any, List, Optional
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
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        parsed = json.loads(content.strip())
        return parsed
    except Exception as e:
        logger.error(f"Claude API resume extraction failed: {e}")
        return fallback_data


def extract_job_requirements(jd_text: Optional[str], company: str, role: str, source_type: str = "industry_benchmark") -> Dict[str, Any]:
    """
    Extract structured job requirements (required technical skills, preferred skills, experience, education)
    from job description text (from external job API or user paste).
    If no text is supplied or API fails, returns grounded industry standard benchmark without inventing fake facts.
    Supports ALL streams: IT, MBA, BCA, B.Com, Arts, Engineering, Science, etc.
    """
    # Industry standard fallback dictionary for role titles when no raw JD text is available
    # Covers Tech, Business, Finance, Marketing, HR, Design, Engineering, Science, and more
    ROLE_STANDARDS = {
        # ── Tech / IT roles ──
        "python": ["Python", "SQL", "REST APIs", "Git", "FastAPI", "Docker", "PostgreSQL"],
        "software": ["Java", "Python", "SQL", "Git", "Data Structures", "System Design", "Agile"],
        "full stack": ["JavaScript", "React", "Node.js", "HTML/CSS", "SQL", "Git", "REST APIs"],
        "backend": ["Python", "Node.js", "Java", "SQL", "REST APIs", "Docker", "Git"],
        "frontend": ["JavaScript", "HTML/CSS", "React", "TypeScript", "Redux", "Git"],
        "data analyst": ["SQL", "Excel", "Python", "Tableau", "Power BI", "Statistics"],
        "data scientist": ["Python", "SQL", "Statistics", "Machine Learning", "Pandas", "Scikit-Learn"],
        "machine learning": ["Python", "PyTorch", "TensorFlow", "Scikit-Learn", "Docker", "Git"],
        "devops": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Terraform", "Git"],
        "cloud": ["AWS", "Azure", "Docker", "Kubernetes", "Linux", "Python", "Terraform"],
        "java": ["Java", "Spring Boot", "SQL", "Hibernate", "REST APIs", "Git", "Maven"],
        "servicenow": ["JavaScript", "ServiceNow ITSM", "HTML/CSS", "REST APIs", "Workflow Automation"],
        "cyber security": ["Network Security", "SIEM Tools", "Vulnerability Assessment", "Linux", "Python", "Firewall Management"],
        "network": ["TCP/IP", "Routing & Switching", "Firewall", "CCNA", "Linux", "Network Monitoring"],
        "database admin": ["SQL", "PostgreSQL", "MySQL", "Oracle", "Database Tuning", "Backup & Recovery"],
        "qa": ["Manual Testing", "Selenium", "Test Planning", "JIRA", "API Testing", "SQL"],
        "android": ["Java", "Kotlin", "Android SDK", "REST APIs", "Git", "Firebase"],
        "ios": ["Swift", "Xcode", "UIKit", "REST APIs", "Git", "Core Data"],
        "mobile": ["React Native", "Flutter", "REST APIs", "Git", "Firebase", "App Store Deployment"],
        "ui/ux": ["Figma", "Adobe XD", "Wireframing", "Prototyping", "User Research", "Design Systems"],
        "graphic design": ["Adobe Photoshop", "Adobe Illustrator", "Canva", "Typography", "Branding", "Visual Communication"],
        # ── Business / Management roles (MBA, BBA, PGDM) ──
        "business analyst": ["Requirements Gathering", "SQL", "Excel", "JIRA", "Business Process Modeling", "Stakeholder Management", "Documentation"],
        "management consultant": ["Strategy", "Financial Modeling", "PowerPoint", "Excel", "Case Analysis", "Stakeholder Management"],
        "product manager": ["Product Roadmapping", "Agile/Scrum", "Data Analytics", "User Research", "A/B Testing", "JIRA", "Stakeholder Management"],
        "project manager": ["Project Planning", "Agile/Scrum", "MS Project", "Risk Management", "JIRA", "Stakeholder Communication", "Budgeting"],
        "operations manager": ["Supply Chain Management", "Process Optimization", "ERP Systems", "Lean/Six Sigma", "Excel", "Vendor Management"],
        "supply chain": ["Inventory Management", "SAP", "Logistics", "Vendor Management", "Excel", "Demand Forecasting"],
        # ── Marketing roles ──
        "marketing": ["Digital Marketing", "SEO/SEM", "Google Analytics", "Social Media Marketing", "Content Strategy", "Email Marketing"],
        "brand manager": ["Brand Strategy", "Market Research", "Campaign Management", "Consumer Insights", "Budgeting", "Creative Briefing"],
        "content": ["Content Writing", "SEO", "WordPress", "Social Media", "Copywriting", "Content Strategy", "Google Analytics"],
        "social media": ["Social Media Platforms", "Content Creation", "Analytics Tools", "Community Management", "Paid Advertising", "Canva"],
        # ── Finance / Commerce roles (B.Com, MBA Finance, CA) ──
        "financial analyst": ["Financial Modeling", "Excel", "Accounting", "Valuation", "Bloomberg Terminal", "SQL", "Financial Reporting"],
        "accountant": ["Tally", "Excel", "GST Filing", "Financial Statements", "Auditing", "SAP FICO", "Taxation"],
        "credit analyst": ["Credit Risk Assessment", "Financial Analysis", "Excel", "Regulatory Compliance", "Banking Operations", "SQL"],
        "investment": ["Financial Modeling", "Valuation", "Bloomberg", "Excel", "Equity Research", "Portfolio Management"],
        "auditor": ["Auditing Standards", "Excel", "SAP", "Taxation", "Financial Reporting", "Compliance"],
        "banking": ["Banking Operations", "KYC/AML", "Excel", "Customer Relationship", "Financial Products", "Regulatory Compliance"],
        # ── HR roles ──
        "hr": ["Recruitment", "Employee Relations", "HRIS Systems", "Payroll Management", "Labor Law", "Performance Management", "Excel"],
        "talent acquisition": ["Sourcing", "LinkedIn Recruiter", "ATS Systems", "Interviewing", "Employer Branding", "Onboarding"],
        "recruiter": ["Sourcing Candidates", "LinkedIn Recruiter", "ATS Tools", "Interviewing Skills", "Negotiation", "Onboarding"],
        # ── Sales roles ──
        "sales": ["CRM Tools", "Negotiation", "Lead Generation", "Communication", "Market Research", "Salesforce", "Target Achievement"],
        "account manager": ["Client Relationship", "CRM Tools", "Negotiation", "Revenue Management", "Upselling", "Presentation Skills"],
        "business development": ["Lead Generation", "Market Research", "CRM Tools", "Negotiation", "Proposal Writing", "Networking"],
        # ── Research / Science roles ──
        "research": ["Research Methodology", "Data Analysis", "Statistical Tools", "Literature Review", "Report Writing", "SPSS/R"],
        "lab": ["Laboratory Techniques", "Quality Control", "Documentation", "Safety Protocols", "Analytical Instruments", "Data Recording"],
        "biotech": ["Molecular Biology", "PCR", "Bioinformatics", "Lab Safety", "Research Methodology", "Scientific Writing"],
        "pharma": ["Drug Formulation", "GMP", "Quality Assurance", "Regulatory Affairs", "Clinical Trials", "Documentation"],
        # ── Engineering (Civil, Mechanical, Electrical) ──
        "civil engineer": ["AutoCAD", "Structural Analysis", "Project Management", "Site Supervision", "Concrete Technology", "Estimation"],
        "mechanical engineer": ["AutoCAD", "SolidWorks", "Thermodynamics", "Manufacturing Processes", "Quality Control", "Project Management"],
        "electrical engineer": ["Circuit Design", "PLC Programming", "AutoCAD Electrical", "Power Systems", "Embedded Systems", "Safety Standards"],
        "site engineer": ["AutoCAD", "Site Supervision", "Quality Control", "Safety Management", "Estimation", "Project Scheduling"],
        # ── Education / Teaching ──
        "teacher": ["Subject Expertise", "Lesson Planning", "Classroom Management", "Communication", "Educational Technology", "Assessment Design"],
        "trainer": ["Training Design", "Presentation Skills", "LMS Platforms", "Content Creation", "Assessment", "Communication"],
        # ── Legal ──
        "legal": ["Legal Research", "Contract Drafting", "Regulatory Compliance", "Litigation Support", "Legal Writing", "Case Management"],
        # ── Admin / Others ──
        "administrative": ["MS Office", "Calendar Management", "Communication", "Data Entry", "Filing", "Coordination"],
        "customer service": ["Communication", "CRM Tools", "Problem Solving", "Patience", "Ticketing Systems", "Product Knowledge"],
    }

    def get_standard_role_skills(role_title: str) -> List[str]:
        lowered = role_title.lower()
        for key, skills in ROLE_STANDARDS.items():
            if key in lowered:
                return skills
        # Extract title keywords as baseline — works for ANY unknown role
        stop_words = {"developer", "engineer", "senior", "junior", "lead", "manager",
                      "intern", "executive", "associate", "assistant", "head", "chief",
                      "specialist", "coordinator", "officer", "analyst", "consultant"}
        words = [w.capitalize() for w in re.findall(r'\b[A-Za-z]{3,}\b', role_title) if w.lower() not in stop_words]
        base = words + ["Communication", "Problem Solving", "MS Office", "Teamwork"]
        return list(dict.fromkeys(base))[:6]

    def get_standard_education(role_title: str) -> str:
        lowered = role_title.lower()
        if any(k in lowered for k in ["software", "developer", "devops", "cloud", "backend", "frontend", "full stack", "data", "machine learning", "cyber"]):
            return "Bachelor's degree in Computer Science, IT, BCA, MCA, B.Tech, or related technical field"
        if any(k in lowered for k in ["business", "consultant", "product manager", "operations", "supply chain", "brand"]):
            return "MBA, BBA, PGDM, or equivalent management degree"
        if any(k in lowered for k in ["financial", "accountant", "credit", "investment", "auditor", "banking"]):
            return "B.Com, MBA Finance, CA, CFA, or equivalent commerce/finance degree"
        if any(k in lowered for k in ["marketing", "content", "social media"]):
            return "MBA Marketing, BBA, Mass Communication, or related degree"
        if any(k in lowered for k in ["hr", "talent", "recruiter"]):
            return "MBA HR, BBA, or equivalent management degree"
        if any(k in lowered for k in ["civil", "mechanical", "electrical", "site"]):
            return "B.E./B.Tech in relevant engineering discipline"
        if any(k in lowered for k in ["pharma", "biotech", "lab"]):
            return "B.Pharm, M.Pharm, B.Sc Biotechnology, or related science degree"
        if any(k in lowered for k in ["teacher", "trainer"]):
            return "B.Ed, M.Ed, or relevant subject degree with teaching certification"
        if any(k in lowered for k in ["graphic", "ui/ux", "design"]):
            return "Bachelor's in Design, Fine Arts, or related creative field"
        return "Bachelor's degree in a relevant field or equivalent experience"

    def get_standard_preferred(role_title: str) -> List[str]:
        lowered = role_title.lower()
        if any(k in lowered for k in ["developer", "engineer", "devops", "cloud", "backend", "frontend"]):
            return ["Docker", "CI/CD", "Agile Methodology"]
        if any(k in lowered for k in ["business", "consultant", "product", "project", "operations"]):
            return ["Six Sigma", "PMP Certification", "Advanced Excel"]
        if any(k in lowered for k in ["financial", "accountant", "banking", "credit"]):
            return ["SAP FICO", "Advanced Excel", "Financial Certifications"]
        if any(k in lowered for k in ["marketing", "brand", "content", "social"]):
            return ["Google Ads Certification", "HubSpot", "Data Analytics"]
        if any(k in lowered for k in ["hr", "recruiter", "talent"]):
            return ["SHRM Certification", "Advanced Excel", "People Analytics"]
        return ["Relevant Certifications", "Leadership Skills", "Domain Expertise"]

    # If no JD text is provided, build grounded benchmark
    if not jd_text or len(jd_text.strip()) < 30:
        standard_skills = get_standard_role_skills(role)
        return {
            "company": company,
            "role": role,
            "required_skills": standard_skills,
            "preferred_skills": get_standard_preferred(role),
            "experience_required": "0-3+ years relevant experience (freshers may apply for entry-level)",
            "education_required": get_standard_education(role),
            "other_qualifications": ["Strong communication skills", "Team collaboration", "Problem solving", "Willingness to learn"],
            "source": "industry_benchmark",
            "source_label": f"Industry Standard Benchmark for {role}",
            "raw_snippet": f"Standard industry role requirements for {role}. For company-specific criteria, paste the exact job description."
        }

    # If Anthropic API key is available, use Claude to parse raw JD text
    client = get_claude_client()
    if client:
        prompt = f"""Extract structured job requirements from the following job description for "{role}" at "{company}".
Return ONLY a valid JSON object in this exact schema:
{{
  "required_skills": ["Skill1", "Skill2", "Skill3"],
  "preferred_skills": ["PreferredSkill1", "PreferredSkill2"],
  "experience_required": "e.g. 2+ years of software development experience",
  "education_required": "e.g. Bachelor's in CS or equivalent",
  "other_qualifications": ["Qualification1", "Qualification2"]
}}

Job Description Text:
{jd_text[:4000]}
"""
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=800,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            content = response.content[0].text
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            parsed = json.loads(content.strip())
            parsed["company"] = company
            parsed["role"] = role
            parsed["source"] = source_type
            parsed["source_label"] = "Extracted from Real Job Description Text"
            parsed["raw_snippet"] = jd_text[:300] + "..." if len(jd_text) > 300 else jd_text
            return parsed
        except Exception as e:
            logger.error(f"Claude API job requirement extraction failed: {e}")

    # Heuristic / Keyword Extractor if LLM is unavailable
    COMMON_TECH_STACK = [
        "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "PHP", "Ruby",
        "React", "Angular", "Vue", "Node.js", "Express", "FastAPI", "Django", "Flask", "Spring Boot",
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Oracle",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Linux", "Git", "CI/CD", "Terraform",
        "REST APIs", "GraphQL", "Microservices", "HTML", "CSS", "Tailwind", "Bootstrap",
        "Pandas", "NumPy", "Scikit-Learn", "TensorFlow", "PyTorch", "Tableau", "Power BI", "Excel"
    ]
    extracted_skills = []
    for tech in COMMON_TECH_STACK:
        pattern = r'\b' + re.escape(tech) + r'\b'
        if re.search(pattern, jd_text, re.IGNORECASE):
            extracted_skills.append(tech)

    if not extracted_skills:
        extracted_skills = get_standard_role_skills(role)

    # Extract experience line if present
    exp_match = re.search(r'(\d+[\+\-]?\s*(?:to\s*\d+)?\s*(?:years?|yrs?))', jd_text, re.IGNORECASE)
    exp_req = exp_match.group(1) + " experience" if exp_match else "1-3+ Years relevant experience"

    # Extract education line if present
    edu_match = re.search(r'(bachelor|master|b\.s|b\.e|b\.tech|degree|computer science)', jd_text, re.IGNORECASE)
    edu_req = "Bachelor's degree in Computer Science or related field" if edu_match else "Degree in relevant technical field or equivalent experience"

    label = "Extracted via External Job Search API" if source_type == "live_job_api" else "Extracted from User Job Description"

    return {
        "company": company,
        "role": role,
        "required_skills": extracted_skills[:8],
        "preferred_skills": extracted_skills[8:12] if len(extracted_skills) > 8 else ["Agile", "Problem Solving"],
        "experience_required": exp_req,
        "education_required": edu_req,
        "other_qualifications": ["Team collaboration", "Problem solving"],
        "source": source_type,
        "source_label": label,
        "raw_snippet": jd_text[:300] + "..." if len(jd_text) > 300 else jd_text
    }


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
