# CLARIO vs MEDI-KIOSK1 Reference Audit & Feature Integration Plan

**Audit Date:** October 14, 2026  
**Audited Reference:** `C:\Users\User\Downloads\MEDI-KIOSK1-ai-pipeline\MEDI-KIOSK1-ai-pipeline`  
**Target Application:** CLARIO — Health Intelligence (`d:\projects(p)\CLARIO`)

---

## 1. Architectural & Environmental Comparison

| Dimension | MEDI-KIOSK1 Reference | CLARIO Current System |
|---|---|---|
| **Primary Architecture** | Microservices: Express (port 5000) + Python AI Pipeline (port 5001) | Monolithic API: FastAPI (port 8000) + React/Vite (port 3000) |
| **Database** | PostgreSQL (`pg` pool, requires `DATABASE_URL`) | SQLite persistent file database (`clario.db`, zero-config) |
| **Authentication** | JWT + bcrypt user sessions (patients, doctors) | Role-based navigation for hackathon prototype (transparent, zero-login blocker) |
| **Clinical Intelligence** | Dual: Gemini Vision/LLM primary with deterministic regex fallback (`medical_parser.py`) | Deterministic, explainable Python clinical safety & rules engine (`clinical_rules.py`) |
| **Document / Text Processing** | OCR via Google Cloud Vision + PyMuPDF / pdf2image + `text_cleaner.py` | Direct structured patient intake + clinical case structuring |
| **Design System** | Generic CSS cards, emoji icons (`👨‍⚕️`, `📋`), basic tables | Custom healthcare design system: Deep teal (`#123B3A`), Mint (`#D7F3E8`), soft neutral (`#F7F9F7`), Lucide icons |
| **Dependencies** | Heavy (Postgres, Tesseract, Poppler, google-genai, Express, Multer) | Lightweight (FastAPI, Uvicorn, Pydantic, React, Lucide, SQLite) |

---

## 2. Feature Comparison Matrix

| Feature | Evidence in MEDI-KIOSK1 | In CLARIO Already? | Demo Value | Complexity | Decision |
|---|---|---|---|---|---|
| **Structured Patient Intake** | Multi-screen flow (`patientRoutes.js`, `PatientRegistration.jsx`) | **Yes**: Validated multi-field intake with real-time feedback | High | Low | **Preserve CLARIO** |
| **Clinical Text Cleaning** | `extraction/text_cleaner.py` (whitespace, line breaks, control characters, artifact cleanup) | **Partial**: Basic string trimming | High | Low | **Integrate** |
| **Deterministic Medication Parsing** | `summarization/medical_parser.py` (`_extract_medicines`, drug forms `tab/cap/syp`, frequencies `od/bd/tds/sos`) | **Partial**: Basic comma splitting for medication count | Very High | Low | **Integrate** |
| **Lab Value & Vitals Range Checking** | `summarization/medical_parser.py` (`_extract_lab_values`, reference ranges for Hb, FBS, WBC, Creatinine, etc.) | **No**: Only free-text symptom notes | Very High | Medium | **Integrate** |
| **Timeline / Date Extraction** | `summarization/medical_parser.py` (`_extract_dates`, regex for date patterns in notes) | **No**: Timestamp only | Medium | Low | **Integrate** |
| **Clinical Safety / Red Flag Warnings** | Rudimentary keyword checks in `medical_parser.py` | **Yes**: Advanced cardiovascular, stroke, respiratory, hemorrhage, pediatric, and geriatric rules | Critical | Low | **Preserve & Enhance** |
| **Missing Information Prompts** | Minimal in MEDI-KIOSK1 | **Yes**: Deterministic detection for pain scale, allergies, dosage, onset | Critical | Low | **Preserve & Expand** |
| **Doctor Triage & Queue Management** | `doctorRoutes.js`, `DoctorDashboard.jsx` (Postgres query) | **Yes**: Status filtering, search, metrics, review modal, persistent SQLite updates | High | Low | **Preserve CLARIO** |
| **PostgreSQL Database** | `src/config/db.js` (`pg` pool) | **No**: Persistent SQLite with parameterized queries | Low (adds external dependency risk) | High | **Exclude** |
| **JWT Authentication** | `authController.js`, `authMiddleware.js` | **No**: Prototype navigation | Low (creates demo login friction) | Medium | **Exclude** |
| **Heavy PDF/OCR Pipeline** | `pdf_processor.py`, `ocr_processor.py` (requires Poppler, Tesseract system binaries) | **No**: Direct patient story entry | Low (fragile on demo Wi-Fi/system PATH) | High | **Defer** |
| **External LLM Service** | `summarizer.py` (requires `GEMINI_API_KEY`) | **No**: Deterministic offline rules | Low (external API rate limit/outage risk) | Medium | **Defer** (Optional hook only) |

---

## 3. High-Value Features Selected for Immediate Integration

1. **Input Normalization & Text Cleaning Engine (`backend/text_cleaner.py`)**:
   - Clean raw patient descriptions, notes, and medication lists by stripping control characters, normalizing varied line endings, collapsing excess whitespaces, and dropping OCR/paste noise.
2. **Clinical Medication & Dosage Extractor (`backend/clinical_rules.py`)**:
   - Extract structured medication profiles: brand/generic names, forms (`tablet`, `capsule`, `syrup`, `injection`, `inhaler`), frequencies (`OD`, `BD`, `TDS`, `QID`, `PRN`, `daily`), and dosages (`mg`, `mcg`, `ml`, `IU`).
3. **Lab Values & Vital Signs Extractor with Clinical Range Alerts (`backend/clinical_rules.py`)**:
   - Detect physiological metrics and lab findings mentioned in notes/history (Blood Pressure, SpO2, Heart Rate, Temperature, Blood Glucose, Hemoglobin).
   - Evaluate against physiological reference ranges to generate alerts (e.g. `Hypoxia SpO2 < 92%`, `Hypertensive Crisis BP systolic > 180`, `High Fever > 103°F`).
4. **Enhanced Missing-Information Prompts**:
   - Alert clinicians when medications are listed without frequencies, when pain is reported without a 1-10 severity score, or when vital sign trends are omitted.
5. **Frontend Case Detail Display Updates (`CaseDetailModal.tsx`)**:
   - Render structured parsed medications badges and extracted lab values/vitals cards directly in the Clinician Case Review Modal without altering existing responsive layout.
