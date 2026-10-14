"""
CLARIO — Health Intelligence Backend API
FastAPI backend service providing case intake, persistent SQLite storage,
deterministic clinical intelligence summaries, and case status management.
"""
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import os

from schemas import CaseCreate, CaseResponse, CaseStatusUpdate, CaseStats
import database as db

app = FastAPI(
    title="CLARIO — Health Intelligence API",
    description="Intelligent patient intake, case structuring, and clinical dashboard support.",
    version="1.0.0"
)

# Configure CORS strictly for localhost origins (development)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Ensure database and tables are initialized on startup."""
    db.init_db()


@app.get("/health", tags=["System"])
def health_check():
    """Health status endpoint."""
    return {
        "status": "healthy",
        "service": "CLARIO Health Intelligence API",
        "database": "SQLite (persistent)",
        "version": "1.0.0"
    }


@app.get("/api/stats", response_model=CaseStats, tags=["Cases"])
def get_stats():
    """Returns overview case metrics for the doctor dashboard."""
    return db.get_dashboard_stats()


@app.post("/api/cases", response_model=CaseResponse, status_code=status.HTTP_201_CREATED, tags=["Cases"])
def create_patient_case(payload: CaseCreate):
    """
    Submits and persists a new patient intake case.
    Validates patient data, generates deterministic clinical structure and safety flags,
    and returns the created record with unique case ID.
    """
    case_dict = payload.model_dump()
    created = db.create_case(case_dict)
    return created


@app.get("/api/cases", response_model=List[CaseResponse], tags=["Cases"])
def list_cases(
    status: Optional[str] = Query(default=None, description="Filter by status: pending, in_review, completed, or all"),
    search: Optional[str] = Query(default=None, description="Search term across ID, name, chief complaint, symptoms")
):
    """Returns saved cases for clinician review queue with optional search and status filtering."""
    return db.get_all_cases(status=status, search=search)


@app.get("/api/cases/{case_id}", response_model=CaseResponse, tags=["Cases"])
def get_case(case_id: str):
    """Retrieves a single clinical case record by case ID."""
    case = db.get_case_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found in the database."
        )
    return case


@app.patch("/api/cases/{case_id}/status", response_model=CaseResponse, tags=["Cases"])
def update_status(case_id: str, payload: CaseStatusUpdate):
    """Updates the workflow status of an existing case."""
    updated = db.update_case_status(case_id, payload.status)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case with ID '{case_id}' was not found in the database."
        )
    return updated


@app.post("/api/seed", tags=["Development"])
def reseed_database():
    """Development helper to reload synthetic demonstration patient cases."""
    conn = db.get_db_connection()
    db.seed_synthetic_cases(conn)
    conn.close()
    return {"message": "Synthetic demonstration cases refreshed successfully."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
