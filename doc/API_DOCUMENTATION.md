# CLARIO — REST API Specification & Reference

**Document Version:** 1.0.0  
**API Status:** Active & Tested  
**Date:** October 2026  
**Server Base URL:** `http://localhost:8000`  
**Interactive Docs:** `http://localhost:8000/docs` (Swagger UI) / `http://localhost:8000/redoc` (ReDoc)  
**Repository:** [Nishith45o7/CLARIO--health-intelligence-](https://github.com/Nishith45o7/CLARIO--health-intelligence-)

---

## 1. Overview & Protocol Standards

The CLARIO Backend API provides a RESTful interface over HTTP, using JSON serialization for all request and response bodies.

- **Content-Type:** `application/json`
- **Charset:** `UTF-8`
- **CORS Allowed Origins:** `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:3000`, `http://127.0.0.1:5173`
- **Authentication:** Unrestricted in prototype mode for local workstation triage.

---

## 2. API Endpoints Summary

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/health` | Server health & database verification | `200` |
| `GET` | `/api/stats` | Triage dashboard metrics summary | `200` |
| `GET` | `/api/cases` | Retrieve cases queue with search/filter | `200` |
| `POST` | `/api/cases` | Submit new patient case & execute rules | `201`, `422` |
| `GET` | `/api/cases/{id}` | Retrieve full details of a specific case | `200`, `404` |
| `PATCH` | `/api/cases/{id}/status` | Update case status and doctor notes | `200`, `404`, `422` |

---

## 3. Detailed Endpoint Reference

### 3.1 Health Check
**`GET /health`**

Validates that the FastAPI process is responsive and that the SQLite database is reachable and writable.

#### Response Example (`200 OK`):
```json
{
  "status": "healthy",
  "database": "connected",
  "storage_engine": "sqlite",
  "version": "1.0.0"
}
```

---

### 3.2 Triage Queue Statistics
**`GET /api/stats`**

Returns aggregated case counts categorized by triage status and clinical acuity.

#### Response Example (`200 OK`):
```json
{
  "total": 12,
  "pending": 4,
  "in_review": 3,
  "completed": 5,
  "critical": 2
}
```

---

### 3.3 List Cases (Queue Query)
**`GET /api/cases`**

Retrieves a list of patient cases with optional status filtering and text search.

#### Query Parameters:
- `status` *(optional, string)*: Filter by status (`all`, `pending`, `in_review`, `completed`, `critical`).
- `search` *(optional, string)*: Case-insensitive search matching patient name, case ID, or chief complaint.

#### Response Example (`200 OK`):
```json
[
  {
    "id": "CLR-91596",
    "patient_name": "Eleanor Vance",
    "age": 68,
    "gender": "female",
    "chief_complaint": "Crushing central chest pressure radiating to left arm",
    "status": "pending",
    "has_emergency_flags": true,
    "created_at": "2026-10-14T14:12:45",
    "emergency_flags": [
      {
        "category": "cardiac",
        "severity": "critical",
        "title": "Potential Acute Coronary / Cardiac Warning",
        "matched_terms": ["chest pressure", "radiating to left arm"],
        "action": "Immediate emergency evaluation (911/ED). Obtain STAT 12-lead ECG."
      }
    ],
    "missing_info_prompts": [
      "Clarify pain intensity on a 1-10 numerical rating scale",
      "Confirm explicit allergy status (document NKDA if none)"
    ]
  }
]
```

---

### 3.4 Submit Case (Intake Ingestion)
**`POST /api/cases`**

Submits a new patient intake record. The payload is cleaned, validated, processed by the deterministic rules engine, and persisted to SQLite.

#### Request Body (`CaseCreate` Schema):
```json
{
  "patient_name": "Marcus Brody",
  "age": 54,
  "gender": "male",
  "chief_complaint": "Severe pressure in chest radiating to jaw with cold sweats",
  "detailed_symptoms": "Started 45 minutes ago while climbing stairs. Pressure feels like 8/10. Cold clammy sweat. Short of breath. SpO2 91% on home monitor, BP 185/105.",
  "duration": "45 minutes",
  "onset": "sudden",
  "medical_history": "Hypertension, Hyperlipidemia",
  "allergies": "Penicillin (rash)",
  "current_medications": "Lisinopril 20mg tab OD, Atorvastatin 40mg tab OD, Aspirin 81mg tab daily",
  "additional_notes": "Father had MI at age 52"
}
```

#### Response Example (`201 Created`):
```json
{
  "id": "CLR-44821",
  "patient_name": "Marcus Brody",
  "age": 54,
  "gender": "male",
  "chief_complaint": "Severe pressure in chest radiating to jaw with cold sweats",
  "status": "pending",
  "has_emergency_flags": true,
  "created_at": "2026-10-14T14:15:02",
  "emergency_flags": [
    {
      "category": "cardiac",
      "severity": "critical",
      "title": "Potential Acute Coronary / Cardiac Warning",
      "matched_terms": ["pressure in chest", "radiating to jaw"],
      "action": "Immediate emergency evaluation (911/ED). Obtain STAT 12-lead ECG."
    }
  ],
  "parsed_medications": [
    {
      "raw": "Lisinopril 20mg tab OD",
      "name": "Lisinopril",
      "form": "tab",
      "dosage": "20mg",
      "frequency": "OD"
    },
    {
      "raw": "Atorvastatin 40mg tab OD",
      "name": "Atorvastatin",
      "form": "tab",
      "dosage": "40mg",
      "frequency": "OD"
    },
    {
      "raw": "Aspirin 81mg tab daily",
      "name": "Aspirin",
      "form": "tab",
      "dosage": "81mg",
      "frequency": "daily"
    }
  ],
  "extracted_vitals": [
    {
      "type": "Oxygen Saturation (SpO2)",
      "value": "91%",
      "alert": "Hypoxemia Warning: SpO2 < 92%"
    },
    {
      "type": "Blood Pressure",
      "value": "185/105",
      "alert": "Hypertensive Urgency / Crisis Warning: Systolic ≥ 180 mmHg"
    }
  ],
  "missing_info_prompts": [],
  "structured_summary": "PATIENT INTAKE SUMMARY\nPatient: Marcus Brody (54 M)\nChief Complaint: Severe pressure in chest radiating to jaw with cold sweats\nOnset: sudden | Duration: 45 minutes\n..."
}
```

---

### 3.5 Retrieve Single Case
**`GET /api/cases/{case_id}`**

Retrieves the complete clinical record, structured summary, parsed medications, vitals alerts, and doctor notes for a single case ID.

#### Response Codes:
- `200 OK`: Returns the full case record.
- `404 Not Found`: If `case_id` does not exist in the database.

---

### 3.6 Update Case Status & Clinician Notes
**`PATCH /api/cases/{case_id}/status`**

Updates the workflow lifecycle state (`pending`, `in_review`, `completed`) and appends clinician assessment notes.

#### Request Body:
```json
{
  "status": "completed",
  "doctor_notes": "Patient transferred directly to Resus 1 for STAT ECG. 12-lead showed anterior STEMI. Cardiology team alerted."
}
```

#### Response Example (`200 OK`):
```json
{
  "id": "CLR-44821",
  "status": "completed",
  "doctor_notes": "Patient transferred directly to Resus 1 for STAT ECG. 12-lead showed anterior STEMI. Cardiology team alerted.",
  "updated_at": "2026-10-14T14:18:22"
}
```

#### Error Response Example (`422 Unprocessable Entity`):
If an invalid status value is supplied:
```json
{
  "detail": "Invalid status 'discharged'. Must be one of: pending, in_review, completed"
}
```
