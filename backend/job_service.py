import os
import logging
import urllib.parse
from typing import Dict, Any, Optional
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY") or os.getenv("JOB_API_KEY", "")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST", "jsearch.p.rapidapi.com")

def fetch_external_job_requirements(company: str, role: str) -> Optional[Dict[str, Any]]:
    """
    Securely query external job search API (e.g., JSearch via RapidAPI) for active job postings.
    Returns parsed raw job description and snippet metadata if successful, or None on failure/missing key.
    """
    if not RAPIDAPI_KEY or RAPIDAPI_KEY.strip() in ["", "your_rapidapi_key_here", "your_job_api_key_here"]:
        logger.info("No valid RAPIDAPI_KEY/JOB_API_KEY configured. Skipping external job API call.")
        return None

    query = f"{role} at {company}"
    url = f"https://{RAPIDAPI_HOST}/search"
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY.strip(),
        "X-RapidAPI-Host": RAPIDAPI_HOST.strip()
    }
    params = {
        "query": query,
        "page": "1",
        "num_pages": "1"
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=8)
        if response.status_code == 200:
            data = response.json()
            jobs = data.get("data", [])
            if jobs and isinstance(jobs, list) and len(jobs) > 0:
                top_job = jobs[0]
                return {
                    "job_title": top_job.get("job_title", role),
                    "employer_name": top_job.get("employer_name", company),
                    "job_description": top_job.get("job_description", ""),
                    "job_highlights": top_job.get("job_highlights", {}),
                    "source": "live_job_api",
                    "apply_link": top_job.get("job_apply_link", "")
                }
            else:
                logger.info(f"No job posting results returned for query: {query}")
                return None
        elif response.status_code == 429:
            logger.warning("External Job API rate limit reached.")
            return None
        else:
            logger.warning(f"External Job API returned status {response.status_code}: {response.text}")
            return None
    except Exception as e:
        logger.error(f"Error fetching from external job API: {e}")
        return None
