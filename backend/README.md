# CareerMap AI — FastAPI Backend

FastAPI + SQLite + Anthropic Claude AI hybrid backend for the CareerMap AI platform.

## 🚀 Setup & Run Instructions

### 1. Create & Activate Virtual Environment
```bash
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# macOS / Linux:
source venv/bin/activate
```

### 2. Install Requirements
```bash
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and configure your settings:
```bash
copy .env.example .env
```
Edit `.env` to insert your `ANTHROPIC_API_KEY`:
```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
SECRET_KEY=your_custom_jwt_secret_key
DATABASE_URL=sqlite:///./careermap.db
RAPIDAPI_KEY=your_rapidapi_key_here
RAPIDAPI_HOST=jsearch.p.rapidapi.com
```
*(Note: If `RAPIDAPI_KEY` or `ANTHROPIC_API_KEY` are omitted, the API automatically uses a clean grounded heuristic fallback system across all professional fields — IT, MBA, B.Com, Engineering, Arts, Science, etc.).*

### 3-Tier Dynamic Job Requirement Resolution:
1. **Tier 1 (Live Job API)**: Queries real-time job postings via JSearch / RapidAPI for current hiring criteria.
2. **Tier 2 (User-Supplied JD)**: Analyzes user-pasted job postings directly to extract company-specific requirements.
3. **Tier 3 (Role Benchmark Standards)**: Leverages industry-standard competency benchmarks for any role, ensuring no hallucinations.


### 4. Run the Development Server
```bash
uvicorn main:app --reload --port 8000
```
- Interactive API Documentation (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
- Alternative API Documentation (ReDoc): [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🛠️ API Routes Overview

- **`POST /api/auth/register`** — Register new user & get JWT token
- **`POST /api/auth/login`** — Login user & return JWT token
- **`GET /api/auth/me`** — Validate session & return current user details
- **`POST /api/resume/upload`** — Parse PDF/DOCX resume file into JSON structure
- **`GET /api/profile`** — Fetch user's saved profile skills & details
- **`PUT /api/profile`** — Update confirmed skills, experience, and education
- **`GET /api/companies`** — List target companies
- **`GET /api/roles/{company}`** — Get roles & required skills for a target company
- **`POST /api/analysis/run`** — Calculate readiness score, skill gaps & learning roadmap
- **`GET /api/analysis/latest`** — Retrieve latest analysis results
- **`GET /api/progress/history`** — Retrieve historical score trend entries
- **`PUT /api/progress/roadmap/{skill_id}`** — Mark roadmap milestone as completed
