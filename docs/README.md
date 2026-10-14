# CLARIO Documentation Hub & Index

Welcome to the official technical documentation suite for **CLARIO — Health Intelligence**.

CLARIO is an AI-assisted patient case-taking and clinical documentation prototype that transforms raw patient-reported symptoms into structured clinical summaries, identifies missing information, detects emergency safety flags, and streamlines physician triage review through a connected digital workflow.

---

## 📚 Documentation Index

| Document | Purpose & Summary | Primary Audience |
|---|---|---|
| [**Software Requirements Specification (SRS)**](file:///d:/projects%28p%29/CLARIO/docs/REQUIREMENTS.md) | Comprehensive functional and non-functional requirements, data constraints, and acceptance criteria. | Engineers, QA, System Architects |
| [**Product Requirements Document (PRD)**](file:///d:/projects%28p%29/CLARIO/docs/PRD.md) | Product vision, clinical problem statement, user personas, MoSCoW feature prioritization, and success KPIs. | Product Managers, Stakeholders, Clinical Leads |
| [**System Architecture & Technical Design**](file:///d:/projects%28p%29/CLARIO/docs/ARCHITECTURE.md) | Component architecture, sequence diagrams, SQLite persistence schema, security model, and data flow. | Backend/Frontend Developers, DevOps |
| [**Clinical Rules & Safety Engine Specification**](file:///d:/projects%28p%29/CLARIO/docs/CLINICAL_RULES.md) | Deterministic safety red flags (cardiac, stroke, respiratory), medication parsing, vitals range checking, and missing-information logic. | Clinicians, Clinical Informaticists, Safety Auditors |
| [**REST API Specification & Reference**](file:///d:/projects%28p%29/CLARIO/docs/API_DOCUMENTATION.md) | Full API contracts, Pydantic schemas, endpoints (`/health`, `/api/stats`, `/api/cases`), and synthetic JSON payloads. | Integrators, Frontend & Backend Engineers |
| [**User Guide & Operational Manual**](file:///d:/projects%28p%29/CLARIO/docs/USER_GUIDE.md) | Step-by-step user instructions for the Patient Intake Portal and Clinician Triage Workstation. | Clinicians, Triage Nurses, Patients, Demo Presenters |
| [**Testing & Quality Assurance Report**](file:///d:/projects%28p%29/CLARIO/docs/TESTING_AND_VERIFICATION.md) | Automated integration test report (13/13 passing tests), build verification, and end-to-end test matrix. | QA Engineers, Reviewers, Auditors |
| [**Reference Audit & Feature Integration Plan**](file:///d:/projects%28p%29/CLARIO/docs/REFERENCE_AUDIT.md) | Comparative architecture audit of MEDI-KIOSK1 reference vs. CLARIO, detailing high-value feature adoptions. | Architects, Lead Engineers |

---

## 🧭 Reading Pathways

### For Physicians & Clinical Stakeholders
1. Read the [Product Requirements Document (PRD)](file:///d:/projects%28p%29/CLARIO/docs/PRD.md) for the clinical problem and workflow vision.
2. Read the [Clinical Rules & Safety Engine Specification](file:///d:/projects%28p%29/CLARIO/docs/CLINICAL_RULES.md) to review deterministic emergency flags, vitals thresholds, and missing-information rules.
3. Review the [User Guide](file:///d:/projects%28p%29/CLARIO/docs/USER_GUIDE.md) for workstation operation.

### For Software Developers & DevOps
1. Read the [System Architecture](file:///d:/projects%28p%29/CLARIO/docs/ARCHITECTURE.md) to understand component interactions and data storage.
2. Read the [REST API Specification](file:///d:/projects%28p%29/CLARIO/docs/API_DOCUMENTATION.md) for schemas and endpoint behaviors.
3. Review the [Testing & Verification Report](file:///d:/projects%28p%29/CLARIO/docs/TESTING_AND_VERIFICATION.md) to run integration tests.

### For Quality Assurance & Auditors
1. Inspect the [Software Requirements Specification (SRS)](file:///d:/projects%28p%29/CLARIO/docs/REQUIREMENTS.md).
2. Inspect the [Testing & Quality Assurance Report](file:///d:/projects%28p%29/CLARIO/docs/TESTING_AND_VERIFICATION.md).
