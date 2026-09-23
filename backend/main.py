from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import database, models
from routers import auth_routes, resume_routes, profile_routes, analysis_routes, progress_routes

# Create database tables automatically on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="CareerMap AI API",
    description="Hybrid AI backend for career mapping, resume extraction, readiness scoring, and learning roadmaps.",
    version="1.0.0"
)

# Enable CORS for local frontend development
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_routes.router)
app.include_router(resume_routes.router)
app.include_router(profile_routes.router)
app.include_router(analysis_routes.router)
app.include_router(progress_routes.router)

@app.get("/")
def root():
    return {
        "status": "online",
        "name": "CareerMap AI API",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
