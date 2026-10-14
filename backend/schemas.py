from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class WarningFlag(BaseModel):
    id: str
    severity: str = Field(description="'critical', 'warning', or 'advisory'")
    title: str
    description: str
    guidance: Optional[str] = None


class StructuredSummary(BaseModel):
    title: str = "Automated Clinical Case Summary (Draft for Clinician Review)"
    chief_complaint: str
    reported_symptoms: str
    symptom_duration: str
    relevant_history: str
    current_medications: str
    additional_notes: str
    parsed_medications: Optional[List[Dict[str, Any]]] = []
    extracted_vitals_and_labs: Optional[List[Dict[str, Any]]] = []
    missing_information: List[str] = []
    clinical_disclaimer: str = (
        "This draft summary is automatically organized strictly from patient-reported input "
        "and is intended exclusively to support clinician review. It does not constitute a "
        "medical diagnosis or treatment plan."
    )


class CaseCreate(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=120, description="Patient name or synthetic ID")
    age: int = Field(..., ge=0, le=125, description="Patient age in years")
    chief_complaint: str = Field(..., min_length=3, max_length=500, description="Main symptom or reason for visit")
    symptoms: str = Field(..., min_length=5, max_length=2000, description="Detailed reported symptoms")
    symptom_duration: str = Field(..., min_length=2, max_length=150, description="Duration of symptoms")
    medical_history: Optional[str] = Field(default="", max_length=2000)
    current_medications: Optional[str] = Field(default="", max_length=2000)
    additional_notes: Optional[str] = Field(default="", max_length=2000)

    @field_validator("patient_name", "chief_complaint", "symptoms", "symptom_duration")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError("Field cannot be empty or blank")
        return s


class CaseStatusUpdate(BaseModel):
    status: str = Field(..., description="Must be one of: 'pending', 'in_review', 'completed'")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {"pending", "in_review", "completed"}
        val = v.strip().lower()
        if val not in valid_statuses:
            raise ValueError(f"Invalid status '{v}'. Allowed statuses: {sorted(list(valid_statuses))}")
        return val


class CaseResponse(BaseModel):
    id: str
    patient_name: str
    age: int
    chief_complaint: str
    symptoms: str
    symptom_duration: str
    medical_history: str
    current_medications: str
    additional_notes: str
    structured_summary: Dict[str, Any]
    warning_flags: List[Dict[str, Any]]
    has_emergency_flags: bool
    status: str
    created_at: str
    updated_at: str


class CaseStats(BaseModel):
    total: int
    pending: int
    in_review: int
    completed: int
    critical_warning_count: int
