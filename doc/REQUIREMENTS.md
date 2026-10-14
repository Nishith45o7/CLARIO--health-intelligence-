# CLARIO — Software Requirements Specification (SRS)

**Document Version:** 1.0.0  
**Status:** Approved & Verified  
**Date:** October 2026  
**System Name:** CLARIO — Health Intelligence  
**Target Repository:** [Nishith45o7/CLARIO--health-intelligence-](https://github.com/Nishith45o7/CLARIO--health-intelligence-)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) establishes the complete functional, non-functional, behavioral, and clinical safety requirements for **CLARIO — Health Intelligence**. CLARIO is an AI-assisted patient case-taking and clinical documentation prototype designed to transform unstructured patient-reported symptoms into structured clinical summaries, detect critical safety flags, prompt for missing information, and streamline physician triage.

### 1.2 Scope
CLARIO encompasses:
1. **Patient Intake Web Portal:** A guided, responsive multi-section digital intake form with real-time field validation, quick-fill demo presets, and persistent case submission.
2. **Deterministic Clinical Intelligence Engine:** An explainable, offline-capable Python rules engine that sanitizes input text, structures medications and vital signs, checks physiological safety ranges, detects acute medical red flags, and surfaces omitted clinical context.
3. **Clinician Triage Workstation:** A real-time dashboard featuring live queue statistics, multi-criteria filtering, search capabilities, deep-dive case modals, and persistent status state management.
4. **Persistent Storage Layer:** A zero-configuration, ACID-compliant SQLite datastore with parameterized queries.

### 1.3 Intended Audience
- **Healthcare Practitioners:** Emergency physicians, triage nurses, and ambulatory care doctors reviewing intake drafts.
- **Software Engineers:** Full-stack developers maintaining the React 19 frontend and FastAPI backend.
- **Clinical Informatics & Safety Auditors:** Quality assurance professionals reviewing clinical decision-support boundaries and deterministic rule sets.

---

## 2. Overall Description

### 2.1 Product Perspective
In modern clinical settings, patient-reported symptoms arrive as scattered narratives or hasty handwritten notes. Vital details (such as pain severity, onset speed, or allergy specifics) are frequently omitted, forcing physicians to spend valuable consultation time piecing together basic history. 

CLARIO bridges the gap between patient narrative and clinician action by creating a connected digital pathway:
```mermaid
flowchart LR
    A[Patient Narrative] --> B[Input Cleaning & Validation]
    B --> C[Clinical Rules Engine]
    C --> D[Structured Case Draft & Alerts]
    D --> E[Clinician Triage Workstation]
    E --> F[Persisted Clinical Review]
    classDef teal fill:#123B3A,stroke:#D7F3E8,color:#FFFFFF;
    classDef mint fill:#D7F3E8,stroke:#123B3A,color:#123B3A;
    class A,C,E teal;
    class B,D,F mint;
```

### 2.2 User Classes and Characteristics
1. **Patient / Family Proxy:** Non-clinical users requiring a simple, accessible, high-contrast digital intake experience with clear prompts and zero medical jargon requirements.
2. **Triage Nurse / Intake Coordinator:** Healthcare staff reviewing patient incoming queues, identifying urgent presentations, and prioritizing bed or consultation order.
3. **Reviewing Physician / Clinician:** Licensed clinicians who require rapid, scannable summaries of complaints, explicit safety warnings, parsed medications, and a direct mechanism to log assessment notes.

### 2.3 Operating Environment
- **Operating Systems:** Windows 10/11, macOS 12+, Ubuntu 20.04+ LTS.
- **Backend Runtime:** Python 3.10+ with FastAPI, Uvicorn, and SQLite.
- **Frontend Runtime:** Node.js 18+ (tested on React 19, TypeScript, modern CSS).
- **Client Browsers:** Modern evergreen browsers (Chrome 110+, Edge 110+, Firefox 110+, Safari 16+).

---

## 3. Functional Requirements (FR)

### FR-01: Patient Intake & Demographics Capture
- **FR-01.1:** The system shall capture patient identity details: Full Name (string, min 2 chars), Age (integer, 0 to 125), and Biological Sex (`male`, `female`, `other`).
- **FR-01.2:** The system shall enforce non-empty entry for Chief Complaint and Detailed Symptoms Description before allowing submission.
- **FR-01.3:** The system shall provide optional fields for Duration, Onset, Known Medical Conditions, Known Allergies, Current Medications, and Additional Notes.
- **FR-01.4:** The system shall provide one-click Quick-Fill Presets for rapid simulation of high-acuity (Chest Pressure), moderate-acuity (Cough & Fever), and pediatric (Infant High Fever) clinical scenarios.

### FR-02: Input Sanitization & Clinical Text Normalization
- **FR-02.1:** The backend shall clean all incoming text streams by stripping ASCII control characters, null bytes, and non-printable artifacts.
- **FR-02.2:** The backend shall collapse repeated whitespace, normalize disparate line endings (`\r\n` to `\n`), and remove repetitive punctuation.
- **FR-02.3:** The cleaning pipeline must not discard clinical negation tokens (e.g., "no", "denies", "without", "negative").

### FR-03: Deterministic Clinical Rules & Emergency Red-Flag Detection
- **FR-03.1:** The system shall scan symptoms and complaints for acute **Cardiovascular** indicators:
  - *Keywords:* `chest pain`, `chest pressure`, `crushing chest`, `radiating to arm`, `radiating to jaw`, `diaphoresis`.
  - *Trigger Severity:* `CRITICAL`.
  - *Guidance:* Immediate Emergency Department / 911 alert.
- **FR-03.2:** The system shall scan for acute **Neurological (Stroke / FAST)** indicators:
  - *Keywords:* `facial droop`, `slurred speech`, `arm weakness`, `sudden numbness`, `thunderclap headache`, `loss of vision`.
  - *Trigger Severity:* `CRITICAL`.
- **FR-03.3:** The system shall scan for acute **Severe Respiratory** indicators:
  - *Keywords:* `severe shortness of breath`, `cannot breathe`, `gasping`, `cyanosis`, `stridor`, `oxygen saturation < 90%`.
  - *Trigger Severity:* `CRITICAL`.
- **FR-03.4:** The system shall scan for severe **Infection / Sepsis** indicators (e.g., `high fever > 103`, `rigors`, `altered mental status`).
- **FR-03.5:** The system shall flag age-based vulnerabilities:
  - Pediatric Advisory: Age < 2 years.
  - Geriatric Advisory: Age ≥ 75 years.

### FR-04: Deterministic Medication & Dosage Parsing
- **FR-04.1:** The system shall parse unstructured medication strings into structured entities containing:
  - Drug Name.
  - Pharmaceutical Form (`tablet`, `capsule`, `syrup`, `injection`, `inhaler`, `drops`, `ointment`).
  - Dosage (`mg`, `mcg`, `ml`, `IU`, `g`).
  - Administration Frequency (`OD` [once daily], `BD` [twice daily], `TDS` [thrice daily], `QID` [four times daily], `PRN` [as needed], `daily`, `weekly`).
- **FR-04.2:** The system shall identify **Polypharmacy Risk** when a patient reports ≥ 5 concurrent medications.

### FR-05: Physiological Vitals & Lab Range Alerts
- **FR-05.1:** The system shall extract quantitative vitals and lab mentions:
  - Blood Pressure (systolic/diastolic in mmHg).
  - Oxygen Saturation (SpO2 in %).
  - Heart Rate / Pulse (bpm).
  - Body Temperature (°F or °C).
  - Blood Glucose (mg/dL).
  - Hemoglobin (g/dL).
- **FR-05.2:** The system shall generate clinical range alerts for physiological outliers:
  - *Hypoxemia:* SpO2 < 92%.
  - *Hypertensive Crisis:* Systolic BP ≥ 180 mmHg or Diastolic BP ≥ 120 mmHg.
  - *Tachycardia:* Heart Rate > 110 bpm; *Bradycardia:* Heart Rate < 50 bpm.
  - *High Fever:* Temperature > 102.5°F (39.2°C).

### FR-06: Missing-Information Detection Engine
- **FR-06.1:** The system shall detect when pain is reported without a numerical rating scale (1-10) and generate a prompt for the clinician.
- **FR-06.2:** The system shall verify whether allergy status has been explicitly affirmed or left ambiguous.
- **FR-06.3:** The system shall identify medications entered without specified dosages or frequencies.
- **FR-06.4:** The system shall verify whether symptom onset was sudden vs. gradual.

### FR-07: Persistent Case Storage & State Transitions
- **FR-07.1:** The system shall persist all intake data, generated summaries, flags, and notes into an SQLite database (`clario.db`).
- **FR-07.2:** Each case shall receive a unique, formatted alphanumeric identifier (e.g., `CLR-77491`).
- **FR-07.3:** The system shall support a formal review state lifecycle:
  - `pending` (Default upon submission)
  - `in_review` (Clinician has opened and claimed the case)
  - `completed` (Clinician has finalized review and documented notes)
- **FR-07.4:** State transitions shall be validated and immediately reflected across all dashboard views.

### FR-08: Clinician Workstation & Triage Queue
- **FR-08.1:** The system shall display aggregated metrics: Total Cases, Pending Review, In Review, Completed, and Critical Safety Alerts.
- **FR-08.2:** The queue shall provide real-time filtering by review status and safety severity.
- **FR-08.3:** The queue shall support instant search across Case ID, Patient Name, and Chief Complaint.
- **FR-08.4:** Clicking any case row shall open an in-depth Split-View Case Review Modal.

---

## 4. Non-Functional Requirements (NFR)

### NFR-01: Performance & Response Latency
- **NFR-01.1:** API response time for case submission (`POST /api/cases`) shall not exceed 150 milliseconds under normal local load.
- **NFR-01.2:** Queue query response time (`GET /api/cases`) shall not exceed 50 milliseconds for up to 1,000 cases.
- **NFR-01.3:** Frontend client-side filtering and search shall respond in < 16ms (60 fps rendering).

### NFR-02: Reliability & Zero-External-Dependency Resilience
- **NFR-02.1:** The core application must operate 100% offline without requiring internet access or third-party cloud API keys.
- **NFR-02.2:** Summarization and safety flagging must never crash due to external rate limiting, network disconnects, or upstream cloud outages.
- **NFR-02.3:** Database integrity shall be protected through atomic transactions and WAL (Write-Ahead Logging) mode.

### NFR-03: Clinical Explainability & Safety Guardrails
- **NFR-03.1:** 100% of generated safety alerts must be traceable to exact deterministic rules, matched terms, and physiological reference thresholds.
- **NFR-03.2:** The system must never hallucinate clinical facts, medications, or lab values not present in the patient record.
- **NFR-03.3:** All UI displays must clearly disclaim that generated summaries are drafts for clinician verification and do not constitute autonomous medical diagnoses.

### NFR-04: Usability & Accessibility (WCAG AA)
- **NFR-04.1:** The UI color palette shall strictly conform to WCAG 2.1 Level AA contrast ratios:
  - Primary Brand Deep Teal (`#123B3A`) on light backgrounds: Contrast ratio > 11:1.
  - Critical Danger Red (`#DC2626`) on alert cards: Contrast ratio > 4.5:1.
- **NFR-04.2:** Form inputs shall provide clear focus outlines, ARIA labels, and error summaries.

---

## 5. System Architecture & Component Mapping

| Subsystem | Key Files | Primary Responsibilities |
|---|---|---|
| **Frontend UI** | `frontend/src/App.tsx`<br>`frontend/src/components/*`<br>`frontend/src/index.css` | Patient intake, Doctor triage workstation, case modal, responsive layout |
| **Backend REST API** | `backend/main.py`<br>`backend/schemas.py` | FastAPI routing, CORS handling, Pydantic input validation, HTTP error codes |
| **Clinical Intelligence** | `backend/clinical_rules.py`<br>`backend/text_cleaner.py` | Safety red flags, medication extraction, vitals ranges, missing information engine |
| **Data Persistence** | `backend/database.py` | SQLite connection, table migrations, parameterized CRUD operations |
| **Test Suite** | `backend/test_api.py` | Automated integration tests for all endpoints and clinical rule behaviors |

---

## 6. Verification & Acceptance Criteria

1. **Automated Verification:** All 13 test suites in `backend/test_api.py` must pass with zero failures.
2. **Deterministic Execution:** Same input produces identical summary, flags, and missing prompts on every execution.
3. **Frontend Build:** `npm run build` generates optimized static bundle without TypeScript or bundler errors.
4. **State Persistence:** Case status changes from `pending` -> `in_review` -> `completed` persist across page reloads and backend restarts.
