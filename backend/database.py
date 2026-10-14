"""
CLARIO SQLite Database Layer
Persistent, lightweight database implementation using parameterized queries.
"""
import sqlite3
import json
import os
import random
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from clinical_rules import analyze_patient_case
from text_cleaner import clean_clinical_text

def get_db_path() -> str:
    """Returns persistent DB path or writable /tmp location in serverless environments (e.g. Vercel)."""
    if os.environ.get("CLARIO_DB_PATH"):
        return os.environ["CLARIO_DB_PATH"]
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return os.path.join("/tmp", "clario.db")
    try:
        test_file = os.path.join(os.path.dirname(__file__), ".write_test")
        with open(test_file, "w") as f:
            f.write("ok")
        os.remove(test_file)
        return os.path.join(os.path.dirname(__file__), "clario.db")
    except (OSError, IOError):
        return os.path.join("/tmp", "clario.db")


DB_FILE = get_db_path()


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables and seeds synthetic demo cases if database is empty."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id TEXT PRIMARY KEY,
            patient_name TEXT NOT NULL,
            age INTEGER NOT NULL,
            chief_complaint TEXT NOT NULL,
            symptoms TEXT NOT NULL,
            symptom_duration TEXT NOT NULL,
            medical_history TEXT DEFAULT '',
            current_medications TEXT DEFAULT '',
            additional_notes TEXT DEFAULT '',
            structured_summary TEXT NOT NULL,
            warning_flags TEXT NOT NULL,
            has_emergency_flags INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    conn.commit()

    # Check if empty, seed synthetic cases for realistic hackathon demonstration
    cursor.execute("SELECT COUNT(*) FROM cases")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_synthetic_cases(conn)

    conn.close()


def generate_case_id() -> str:
    """Generates a human-readable unique healthcare case ID, e.g. CLR-84192."""
    rand_num = random.randint(10000, 99999)
    return f"CLR-{rand_num}"


def row_to_case_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "patient_name": row["patient_name"],
        "age": row["age"],
        "chief_complaint": row["chief_complaint"],
        "symptoms": row["symptoms"],
        "symptom_duration": row["symptom_duration"],
        "medical_history": row["medical_history"] or "",
        "current_medications": row["current_medications"] or "",
        "additional_notes": row["additional_notes"] or "",
        "structured_summary": json.loads(row["structured_summary"]),
        "warning_flags": json.loads(row["warning_flags"]),
        "has_emergency_flags": bool(row["has_emergency_flags"]),
        "status": row["status"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def create_case(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """Creates and persists a new patient intake case."""
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # Clean and normalize raw patient inputs using clinical text cleaner
    patient_name = clean_clinical_text(case_data["patient_name"])
    chief_complaint = clean_clinical_text(case_data["chief_complaint"])
    symptoms = clean_clinical_text(case_data["symptoms"])
    symptom_duration = clean_clinical_text(case_data["symptom_duration"])
    medical_history = clean_clinical_text(case_data.get("medical_history", ""))
    current_medications = clean_clinical_text(case_data.get("current_medications", ""))
    additional_notes = clean_clinical_text(case_data.get("additional_notes", ""))

    # Analyze through clinical intelligence rules engine
    structured_summary, warning_flags, has_emergency_flags = analyze_patient_case(
        patient_name=patient_name,
        age=case_data["age"],
        chief_complaint=chief_complaint,
        symptoms=symptoms,
        symptom_duration=symptom_duration,
        medical_history=medical_history,
        current_medications=current_medications,
        additional_notes=additional_notes,
    )

    case_id = generate_case_id()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ensure unique ID
    while True:
        cursor.execute("SELECT 1 FROM cases WHERE id = ?", (case_id,))
        if not cursor.fetchone():
            break
        case_id = generate_case_id()

    cursor.execute("""
        INSERT INTO cases (
            id, patient_name, age, chief_complaint, symptoms,
            symptom_duration, medical_history, current_medications,
            additional_notes, structured_summary, warning_flags,
            has_emergency_flags, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        case_id,
        patient_name,
        case_data["age"],
        chief_complaint,
        symptoms,
        symptom_duration,
        medical_history,
        current_medications,
        additional_notes,
        json.dumps(structured_summary),
        json.dumps(warning_flags),
        1 if has_emergency_flags else 0,
        "pending",
        now_iso,
        now_iso,
    ))
    conn.commit()

    cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id,))
    row = cursor.fetchone()
    conn.close()
    return row_to_case_dict(row)


def get_all_cases(status: Optional[str] = None, search: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves cases with optional filtering and search."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM cases WHERE 1=1"
    params = []

    if status and status.lower() != "all":
        query += " AND status = ?"
        params.append(status.lower())

    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        query += " AND (LOWER(id) LIKE ? OR LOWER(patient_name) LIKE ? OR LOWER(chief_complaint) LIKE ? OR LOWER(symptoms) LIKE ?)"
        params.extend([term, term, term, term])

    query += " ORDER BY created_at DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [row_to_case_dict(r) for r in rows]


def get_case_by_id(case_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a single case by its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id.strip(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return row_to_case_dict(row)


def update_case_status(case_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    """Updates the workflow status of a case."""
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id.strip(),))
    if not cursor.fetchone():
        conn.close()
        return None

    cursor.execute(
        "UPDATE cases SET status = ?, updated_at = ? WHERE id = ?",
        (new_status, now_iso, case_id.strip())
    )
    conn.commit()

    cursor.execute("SELECT * FROM cases WHERE id = ?", (case_id.strip(),))
    row = cursor.fetchone()
    conn.close()
    return row_to_case_dict(row)


def get_dashboard_stats() -> Dict[str, int]:
    """Computes high-level overview metrics for the doctor dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM cases")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases WHERE status = 'pending'")
    pending = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases WHERE status = 'in_review'")
    in_review = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases WHERE status = 'completed'")
    completed = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM cases WHERE has_emergency_flags = 1")
    critical_warning_count = cursor.fetchone()[0]

    conn.close()
    return {
        "total": total,
        "pending": pending,
        "in_review": in_review,
        "completed": completed,
        "critical_warning_count": critical_warning_count
    }


def seed_synthetic_cases(conn: sqlite3.Connection):
    """
    Seeds transparent synthetic demonstration records so the dashboard has rich clinical cases ready for demo.
    All seeded cases are explicitly marked as synthetic demonstration data.
    """
    seeds = [
        {
            "id": "CLR-10482",
            "patient_name": "Eleanor Vance [Synthetic Demo]",
            "age": 68,
            "chief_complaint": "Persistent productive cough and low-grade fatigue",
            "symptoms": "Coughing up greenish sputum for 8 days. Mild chest soreness when coughing heavily. Low energy, mild chills in the evening, no frank shortness of breath.",
            "symptom_duration": "8 days, gradual worsening",
            "medical_history": "Mild COPD (diagnosed 2021), osteopenia. Non-smoker for 15 years. Penicillin allergy (rash).",
            "current_medications": "Albuterol inhaler 2 puffs PRN, Fluticasone 100mcg BID, Vitamin D3 1000 IU daily",
            "additional_notes": "Lives alone with adult daughter visiting on weekends. Home pulse oximeter shows SpO2 94% on room air, home temp 100.6 F.",
            "status": "pending"
        },
        {
            "id": "CLR-29381",
            "patient_name": "Marcus Chen [Synthetic Demo]",
            "age": 52,
            "chief_complaint": "Substernal chest pressure radiating to left arm on exertion",
            "symptoms": "Episodes of dull chest pressure occurring when climbing stairs or walking uphill. Radiates into left shoulder and arm. Relieved by resting for 5 minutes. No nausea today.",
            "symptom_duration": "4 days, episodic with exertion",
            "medical_history": "Hypertension, Hyperlipidemia. Family history of myocardial infarction (father at age 55).",
            "current_medications": "Amlodipine 5mg daily, Atorvastatin 20mg daily, Lisinopril 10mg daily",
            "additional_notes": "Patient noticed chest pressure during morning walk today. Blood pressure checked at pharmacy kiosk: 155/95 mmHg, pulse 84 bpm.",
            "status": "in_review"
        },
        {
            "id": "CLR-37291",
            "patient_name": "Sophia Morales [Synthetic Demo]",
            "age": 29,
            "chief_complaint": "Right lower quadrant abdominal cramping and nausea",
            "symptoms": "Sharp crampy pain in lower right quadrant that started around the navel yesterday morning. Nausea with one episode of vomiting last night. Appetite significantly decreased.",
            "symptom_duration": "28 hours, acute onset",
            "medical_history": "No major chronic illnesses. Previous tonsillectomy (2012). No known drug allergies.",
            "current_medications": "Oral contraceptive pill once daily, Ibuprofen 400mg taken last night with minimal relief",
            "additional_notes": "Pain is worse when walking or coughing. Temperature at home was 99.8 F.",
            "status": "pending"
        },
        {
            "id": "CLR-48102",
            "patient_name": "Arthur Pendelton [Synthetic Demo]",
            "age": 79,
            "chief_complaint": "Bilateral lower extremity edema and mild exertional dyspnea",
            "symptoms": "Gradual swelling in ankles and lower legs over two weeks. Socks leave deep indentations. Mild shortness of breath when walking to the mailbox.",
            "symptom_duration": "14 days, progressive",
            "medical_history": "Type 2 Diabetes Mellitus (15 years), Mild Congestive Heart Failure, Chronic Kidney Disease Stage 2, Hypertension.",
            "current_medications": "Metformin 500mg BID, Furosemide 20mg daily, Carvedilol 6.25mg BID, Losartan 50mg daily, Aspirin 81mg daily",
            "additional_notes": "Weight has increased by approximately 4 pounds over the past 10 days.",
            "status": "completed"
        }
    ]

    now_iso = datetime.now(timezone.utc).isoformat()
    cursor = conn.cursor()

    for s in seeds:
        summary, flags, has_emerg = analyze_patient_case(
            patient_name=s["patient_name"],
            age=s["age"],
            chief_complaint=s["chief_complaint"],
            symptoms=s["symptoms"],
            symptom_duration=s["symptom_duration"],
            medical_history=s["medical_history"],
            current_medications=s["current_medications"],
            additional_notes=s["additional_notes"],
        )

        cursor.execute("""
            INSERT OR REPLACE INTO cases (
                id, patient_name, age, chief_complaint, symptoms,
                symptom_duration, medical_history, current_medications,
                additional_notes, structured_summary, warning_flags,
                has_emergency_flags, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            s["id"],
            s["patient_name"],
            s["age"],
            s["chief_complaint"],
            s["symptoms"],
            s["symptom_duration"],
            s["medical_history"],
            s["current_medications"],
            s["additional_notes"],
            json.dumps(summary),
            json.dumps(flags),
            1 if has_emerg else 0,
            s["status"],
            now_iso,
            now_iso,
        ))
    conn.commit()
