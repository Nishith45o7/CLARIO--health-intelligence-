# CLARIO — System Architecture & Technical Design

**Document Version:** 1.0.0  
**Status:** Implemented & Verified  
**Date:** October 2026  
**System Name:** CLARIO — Health Intelligence  
**Repository:** [Nishith45o7/CLARIO--health-intelligence-](https://github.com/Nishith45o7/CLARIO--health-intelligence-)

---

## 1. Architectural Philosophy

CLARIO is engineered with three primary technical goals:
1. **Zero-Configuration Portability:** Runs immediately on any standard operating system (Windows, Linux, macOS) without requiring Docker, PostgreSQL setup, or third-party cloud accounts.
2. **Deterministic Predictability:** Clinical rule execution is deterministic, explainable, and instantaneous (< 10ms execution).
3. **Decoupled Modern Stack:** Clear separation between a high-performance Python FastAPI backend and a responsive React 19 + TypeScript frontend.

---

## 2. System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client ["Client Layer (Browser)"]
        UI["React 19 + TypeScript SPA"]
        Form["Patient Intake Portal"]
        Dash["Clinician Triage Workstation"]
        Modal["Split-View Case Review Modal"]
        UI --> Form
        UI --> Dash
        Dash --> Modal
    end

    subgraph API ["Backend API Layer (FastAPI :8000)"]
        FastAPI["Uvicorn ASGI + FastAPI Router"]
        Sanitize["Input Sanitizer (text_cleaner.py)"]
        Pydantic["Schema Validation (Pydantic v2)"]
        Rules["Clinical Rules Engine (clinical_rules.py)"]
        FastAPI --> Sanitize
        Sanitize --> Pydantic
        Pydantic --> Rules
    end

    subgraph RulesEngine ["Clinical Intelligence Engine"]
        RedFlags["Emergency Safety Flags (Cardiac, Stroke, Respiratory)"]
        MedParser["Medication & Dosage Parser (Forms, Freqs, Polypharmacy)"]
        VitalsParser["Lab & Physiological Range Checker (BP, SpO2, Temp)"]
        MissingEngine["Missing Clinical Information Generator"]
        Rules --> RedFlags
        Rules --> MedParser
        Rules --> VitalsParser
        Rules --> MissingEngine
    end

    subgraph Storage ["Persistence Layer (SQLite)"]
        DB[("SQLite Database: clario.db")]
        CRUD["Parameterized Queries & WAL Mode"]
        FastAPI --> CRUD
        CRUD --> DB
    end

    Client -- "REST / JSON (HTTP 8000)" --> API
    classDef darkTeal fill:#123B3A,stroke:#D7F3E8,color:#FFFFFF;
    classDef softMint fill:#D7F3E8,stroke:#123B3A,color:#123B3A;
    classDef alertRed fill:#FEE2E2,stroke:#DC2626,color:#991B1B;
    class UI,FastAPI,DB darkTeal;
    class Form,Dash,Modal,Sanitize,Pydantic,Rules,CRUD softMint;
    class RedFlags alertRed;
```

---

## 3. Component Breakdown

### 3.1 Frontend (`/frontend`)
- **Framework:** React 19 with TypeScript 5.8 and modern Vite 6 tooling.
- **Styling Architecture:** Vanilla CSS design tokens (`frontend/src/index.css`) utilizing HSL and hex variables (`#123B3A` Deep Teal, `#D7F3E8` Mint Accent, `#F7F9F7` Canvas). Zero heavy runtime CSS dependencies.
- **Icons:** `lucide-react` for clean, consistent healthcare iconography.
- **Components:**
  - `PatientIntakeForm.tsx`: Multi-section intake form with real-time field validation, quick-fill test presets, and immediate visual feedback.
  - `DoctorDashboard.tsx`: High-density clinical triage workstation featuring real-time overview metrics, instant multi-field search, status filtering, and acuity badges.
  - `CaseDetailModal.tsx`: Comprehensive split-view modal presenting patient-reported facts, automated clinical summary, safety red flag alerts, parsed medication tags, extracted vitals, and one-click status transitions.
  - `Header.tsx`: Unified header with route switching and live backend connectivity status.

### 3.2 Backend API (`/backend`)
- **Framework:** FastAPI with Uvicorn ASGI server.
- **Validation:** Pydantic v2 schemas (`backend/schemas.py`) ensuring strict data types, input sanitization, and schema enforcement.
- **Routing:**
  - `GET /health`: Health probe and database connectivity check.
  - `GET /api/stats`: Dynamic dashboard metrics (total, pending, in_review, completed, critical).
  - `GET /api/cases`: Filtered case list with search support.
  - `POST /api/cases`: New intake ingestion, clinical rule evaluation, and SQLite persistence.
  - `GET /api/cases/{case_id}`: Single case retrieval with full clinical payload.
  - `PATCH /api/cases/{case_id}/status`: Status lifecycle transition and notes persistence.

### 3.3 Clinical Rules Engine (`backend/clinical_rules.py`)
- **Text Cleaner (`backend/text_cleaner.py`):** Normalizes line endings, strips ASCII non-printables, and eliminates redundant spacing while preserving clinical negation terms.
- **Safety Red Flag Detector:** Deterministic regex pattern matching for high-acuity cardiovascular, cerebrovascular (FAST stroke criteria), and acute respiratory emergencies.
- **Medication & Dosage Parser:** Identifies pharmacological dosage units (`mg`, `mcg`, `ml`), delivery forms (`tab`, `cap`, `syp`, `inj`), and medical frequencies (`OD`, `BD`, `TDS`, `PRN`). Flags polypharmacy (≥ 5 drugs).
- **Vitals & Lab Checker:** Extracts quantitative physiological observations and assesses them against clinical danger thresholds (e.g., SpO2 < 92%, BP Systolic ≥ 180).
- **Missing Information Engine:** Scans clinical narratives to alert clinicians to omitted pain ratings, unconfirmed allergies, or ambiguous onset timelines.

### 3.4 Data Persistence (`backend/database.py`)
- **Database Engine:** SQLite 3.
- **Storage Location:** Persistent file at `backend/clario.db`.
- **Database Schema:**
```sql
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    patient_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    chief_complaint TEXT NOT NULL,
    detailed_symptoms TEXT NOT NULL,
    duration TEXT,
    onset TEXT,
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    additional_notes TEXT,
    status TEXT DEFAULT 'pending',
    has_emergency_flags BOOLEAN DEFAULT 0,
    emergency_flags TEXT,          -- JSON array of flag objects
    structured_summary TEXT,      -- Formatted clinical case summary
    missing_info_prompts TEXT,    -- JSON array of missing prompts
    parsed_medications TEXT,      -- JSON array of structured medication objects
    extracted_vitals TEXT,        -- JSON array of extracted vitals & lab alerts
    doctor_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at);
```

---

## 4. Data Flow & Transaction Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient / Proxy
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant Rules as Clinical Rules Engine
    participant DB as SQLite DB
    actor Doctor as Attending Clinician

    Patient->>UI: Fills intake form & clicks Submit
    UI->>API: POST /api/cases (JSON payload)
    API->>API: text_cleaner.sanitize_text()
    API->>API: Validate against CaseCreate schema
    API->>Rules: evaluate_case(case_data)
    Rules->>Rules: Match Red Flags (Cardiac/Stroke/Resp)
    Rules->>Rules: Parse Medications & Check Polypharmacy
    Rules->>Rules: Extract Vitals & Evaluate Ranges
    Rules->>Rules: Generate Missing Information Prompts
    Rules-->>API: ClinicalEvaluationResult
    API->>DB: INSERT INTO cases (Case ID, intake, evaluation)
    DB-->>API: Success (Row committed)
    API-->>UI: HTTP 201 Created (Case ID: CLR-XXXXX)
    UI-->>Patient: Display Confirmation & Case ID

    Doctor->>UI: Opens Clinician Dashboard
    UI->>API: GET /api/stats & GET /api/cases
    API->>DB: SELECT overview metrics & active cases
    DB-->>API: Case records
    API-->>UI: Case queue with Acuity badges
    Doctor->>UI: Clicks case row
    UI->>UI: Renders CaseDetailModal
    Doctor->>UI: Adds clinical notes & sets status to 'completed'
    UI->>API: PATCH /api/cases/{id}/status {status, doctor_notes}
    API->>DB: UPDATE cases SET status=?, doctor_notes=?
    DB-->>API: Row updated
    API-->>UI: HTTP 200 OK
    UI-->>Doctor: Case updated & queue refreshed
```

---

## 5. Security, Privacy & Reliability Guardrails

1. **SQL Injection Defense:** 100% of SQLite queries utilize parameterized statements (`?` parameters), preventing SQL injection vulnerabilities.
2. **CORS Hardening:** Configured with specific local origins and REST verbs.
3. **No External Network Dependencies:** Operates entirely within local subnets. No patient data ever leaves the local environment.
4. **Input Boundary Enforcement:** Strict Pydantic string length limits, regex sanitization, and type coercions prevent buffer overruns or malformed payload crashes.
