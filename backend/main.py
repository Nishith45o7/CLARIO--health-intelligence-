"""
CLARIO — Health Intelligence Backend API
FastAPI backend service providing case intake, persistent SQLite storage,
deterministic clinical intelligence summaries, and case status management.
Enhanced with enterprise-grade Security, Efficiency, and Observability.
"""
import logging
import os
import re
import time
from collections import defaultdict
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

import database as db
from schemas import CaseCreate, CaseResponse, CaseStats, CaseStatusUpdate

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("clario.api")

app = FastAPI(
    title="CLARIO — Health Intelligence API",
    description="Intelligent patient intake, case structuring, and clinical dashboard support.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------
# Security & Efficiency Middleware
# ---------------------------------------------------------

# 1. GZip Compression: Compresses responses > 500 bytes (Efficiency boost)
app.add_middleware(GZipMiddleware, minimum_size=500)


# 2. Security Headers Middleware (Security boost: OWASP compliant)
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' http://localhost:* http://127.0.0.1:* https://*.vercel.app;"
        )
        return response


app.add_middleware(SecurityHeadersMiddleware)


# 3. Payload Size Limiting Middleware (Security & DoS protection: Max 1MB)
class PayloadSizeLimitMiddleware(BaseHTTPMiddleware):
    MAX_BYTES = 1024 * 1024  # 1 MB

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                if int(content_length) > self.MAX_BYTES:
                    logger.warning("Rejected payload exceeding 1MB")
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"detail": "Payload exceeds maximum allowed size of 1MB."}
                    )
            except ValueError:
                pass
        return await call_next(request)


app.add_middleware(PayloadSizeLimitMiddleware)


# 4. In-Memory Sliding Window Rate Limiting (Security & DoS protection: 300 req/min/IP)
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 300, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.ip_records = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        # Clean timestamps outside window
        timestamps = [t for t in self.ip_records[client_ip] if now - t < self.window_seconds]
        if len(timestamps) >= self.max_requests:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please retry in a few seconds."},
                headers={"Retry-After": "60"}
            )
        timestamps.append(now)
        self.ip_records[client_ip] = timestamps
        return await call_next(request)


app.add_middleware(RateLimitMiddleware)


# 5. Secure CORS Configuration: Regex matching local and Vercel domains
ALLOWED_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|.*\.vercel\.app)(:\d+)?$"
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
)


# 6. Global Unhandled Exception Handler (Security: never leak stack traces)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system support."}
    )


# Initialize DB on cold-start
try:
    db.init_db()
    logger.info("Database successfully initialized.")
except Exception as e:
    logger.warning(f"Database initialization notice: {e}")


@app.on_event("startup")
def on_startup():
    """Ensure database and tables are initialized on startup."""
    db.init_db()


# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------

@app.get("/health", tags=["System"])
def health_check():
    """Health status and database latency check."""
    start_t = time.perf_counter()
    db_ok = False
    try:
        conn = db.get_db_connection()
        conn.execute("SELECT 1").fetchone()
        conn.close()
        db_ok = True
    except Exception as exc:
        logger.error(f"Health check DB probe failed: {exc}")

    latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "CLARIO Health Intelligence API",
        "database": "SQLite (persistent WAL mode)",
        "db_latency_ms": latency_ms,
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
    logger.info(f"Created new clinical case {created['id']} for patient: {created['patient_name']}")
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
    logger.info(f"Updated status of case {case_id} to '{payload.status}'")
    return updated


@app.post("/api/seed", tags=["Development"])
def reseed_database():
    """Development helper to reload synthetic demonstration patient cases."""
    conn = db.get_db_connection()
    db.seed_synthetic_cases(conn)
    conn.close()
    logger.info("Synthetic demonstration patient cases reseeded.")
    return {"message": "Synthetic demonstration cases refreshed successfully."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

