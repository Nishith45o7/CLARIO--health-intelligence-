"""
CLARIO Clinical Intelligence & Safety Rules Engine
Deterministic, explainable rule engine that:
1. Structures patient-reported data without fabricating clinical facts.
2. Parses medications and frequencies (adapted from MEDI-KIOSK1 parser).
3. Detects reported vitals/labs and flags values against clinical reference ranges.
4. Identifies missing information a clinician will want to clarify.
5. Flags conservative red flags and safety warnings with transparent triggers.
"""
from typing import Dict, List, Any, Tuple, Optional
import re

# Medication form words & frequencies adapted from MEDI-KIOSK1
DRUG_FORM_PATTERNS = [
    r"\btab(?:let)?s?\b",
    r"\bcap(?:sule)?s?\b",
    r"\bsyp|syrup\b",
    r"\binj(?:ection)?s?\b",
    r"\binhaler\b",
    r"\bdrops?\b",
    r"\bointment\b",
    r"\bcream\b",
    r"\bpatch\b",
    r"\bsolution\b"
]

FREQUENCY_PATTERNS = [
    (r"\b(?:once|1\s*time)\s*(?:a\s*day|daily|die)\b|\bod\b", "Once Daily (OD)"),
    (r"\b(?:twice|2\s*times)\s*(?:a\s*day|daily)\b|\bbid\b|\bb\.i\.d\b", "Twice Daily (BID)"),
    (r"\b(?:three|3\s*times)\s*(?:a\s*day|daily)\b|\btids?\b|\bt\.i\.d\b", "Three Times Daily (TID)"),
    (r"\b(?:four|4\s*times)\s*(?:a\s*day|daily)\b|\bqids?\b|\bq\.i\.d\b", "Four Times Daily (QID)"),
    (r"\b(?:as\s*needed|when\s*needed)\b|\bprn\b|\bsos\b", "As Needed (PRN / SOS)"),
    (r"\bevery\s*morning\b|\bqam\b", "Every Morning"),
    (r"\bat\s*bedtime|every\s*night\b|\bhs\b|\bqhs\b", "At Bedtime (HS)"),
    (r"\bevery\s*(\d+)\s*(?:hours?|hrs?)\b|\bq(\d+)h\b", "Interval Dosing"),
    (r"\bweekly\b|\bonce\s*a\s*week\b", "Weekly"),
]

DOSAGE_PATTERN = re.compile(
    r"\b(\d+(?:\.\d+)?)\s*(mg|mcg|micrograms?|g|grams?|ml|milliliters?|iu|units?|puffs?|drops?|tablets?|capsules?)\b",
    re.IGNORECASE
)

DURATION_PATTERN = re.compile(
    r"\b(?:for|x)\s*(\d+)\s*(days?|weeks?|months?)\b",
    re.IGNORECASE
)


def parse_structured_medications(medications_text: str) -> List[Dict[str, Any]]:
    """
    Deterministically parses patient medication text into structured entries.
    Extracts name, dosage, frequency, and duration when present.
    """
    if not medications_text or not medications_text.strip():
        return []

    entries = []
    # Split by commas, semicolons, or newlines
    lines = [l.strip() for l in re.split(r'[,;\n]+', medications_text) if l.strip()]

    for line in lines:
        entry: Dict[str, Any] = {
            "raw": line,
            "name": line,
            "dosage": None,
            "frequency": None,
            "duration": None,
            "form": None,
        }

        # Match dosage
        dose_match = DOSAGE_PATTERN.search(line)
        if dose_match:
            entry["dosage"] = f"{dose_match.group(1)} {dose_match.group(2).lower()}"

        # Match frequency
        for pattern, label in FREQUENCY_PATTERNS:
            if re.search(pattern, line, re.IGNORECASE):
                entry["frequency"] = label
                break

        # Match duration
        dur_match = DURATION_PATTERN.search(line)
        if dur_match:
            entry["duration"] = f"{dur_match.group(1)} {dur_match.group(2).lower()}"

        # Match drug form
        for fpat in DRUG_FORM_PATTERNS:
            m = re.search(fpat, line, re.IGNORECASE)
            if m:
                entry["form"] = m.group(0).lower()
                break

        entries.append(entry)

    return entries


def extract_vitals_and_labs(text: str) -> List[Dict[str, Any]]:
    """
    Extracts reported physiological vital signs or laboratory values from patient text
    and flags out-of-range clinical thresholds.
    """
    if not text:
        return []

    results = []
    low = text.lower()

    # 1. Blood Pressure (e.g. 140/90, 185/115 mmHg, BP was 140/90)
    bp_match = re.search(r"\b(?:bp|blood\s*pressure)?\s*(?:[:=]|is|was|of|\bat\b)?\s*(\d{2,3})\s*/\s*(\d{2,3})\s*(?:mmhg)?\b", low)
    if bp_match:
        systolic = int(bp_match.group(1))
        diastolic = int(bp_match.group(2))
        if 60 <= systolic <= 260 and 30 <= diastolic <= 160:
            flag = "NORMAL"
            if systolic >= 180 or diastolic >= 120:
                flag = "CRITICAL_HIGH"
            elif systolic >= 140 or diastolic >= 90:
                flag = "HIGH"
            elif systolic < 90 or diastolic < 60:
                flag = "LOW"
            results.append({
                "metric": "Blood Pressure",
                "value": f"{systolic}/{diastolic}",
                "unit": "mmHg",
                "flag": flag,
                "reference_range": "< 120/80 mmHg"
            })

    # 2. Oxygen Saturation (SpO2) (e.g. SpO2 91%, oxygen was 89%)
    spo2_match = re.search(r"\b(?:spo2|oxygen(?:\s*sat(?:uration)?)?|o2\s*sat)\s*(?:[:=]|is|was|of|\bat\b)?\s*(\d{2,3})\s*%?\b", low)
    if spo2_match:
        spo2_val = int(spo2_match.group(1))
        if 50 <= spo2_val <= 100:
            flag = "NORMAL"
            if spo2_val < 92:
                flag = "CRITICAL_LOW"
            elif spo2_val < 95:
                flag = "LOW"
            results.append({
                "metric": "Oxygen Saturation (SpO2)",
                "value": str(spo2_val),
                "unit": "%",
                "flag": flag,
                "reference_range": "95 - 100%"
            })

    # 3. Heart Rate / Pulse (e.g. pulse 110, HR was 55 bpm)
    hr_match = re.search(r"\b(?:hr|pulse|heart\s*rate)\s*(?:[:=]|is|was|of|\bat\b)?\s*(\d{2,3})\s*(?:bpm)?\b", low)
    if hr_match:
        hr_val = int(hr_match.group(1))
        if 30 <= hr_val <= 250:
            flag = "NORMAL"
            if hr_val >= 140:
                flag = "CRITICAL_HIGH"
            elif hr_val > 100:
                flag = "HIGH"
            elif hr_val < 45:
                flag = "CRITICAL_LOW"
            elif hr_val < 60:
                flag = "LOW"
            results.append({
                "metric": "Heart Rate / Pulse",
                "value": str(hr_val),
                "unit": "bpm",
                "flag": flag,
                "reference_range": "60 - 100 bpm"
            })

    # 4. Temperature (e.g. temp 102.4 F or temp was 38.5 C)
    temp_match = re.search(r"\b(?:temp(?:erature)?)\s*(?:[:=]|is|was|of|\bat\b)?\s*(\d{2,3}(?:\.\d+)?)\s*(?:°?\s*(f|c))?\b", low)
    if temp_match:
        try:
            temp_val = float(temp_match.group(1))
            unit = (temp_match.group(2) or "f").upper()
            if unit == "F" and 94.0 <= temp_val <= 108.0:
                flag = "NORMAL"
                if temp_val >= 103.0:
                    flag = "CRITICAL_HIGH"
                elif temp_val >= 100.4:
                    flag = "HIGH"
                elif temp_val < 95.0:
                    flag = "CRITICAL_LOW"
                results.append({
                    "metric": "Body Temperature",
                    "value": f"{temp_val:.1f}",
                    "unit": "°F",
                    "flag": flag,
                    "reference_range": "97.8 - 99.1 °F"
                })
            elif unit == "C" and 34.0 <= temp_val <= 42.0:
                flag = "NORMAL"
                if temp_val >= 39.5:
                    flag = "CRITICAL_HIGH"
                elif temp_val >= 38.0:
                    flag = "HIGH"
                elif temp_val < 35.0:
                    flag = "CRITICAL_LOW"
                results.append({
                    "metric": "Body Temperature",
                    "value": f"{temp_val:.1f}",
                    "unit": "°C",
                    "flag": flag,
                    "reference_range": "36.5 - 37.3 °C"
                })
        except ValueError:
            pass

    # 5. Blood Glucose (e.g. sugar 240 mg/dl, fbs 110)
    bg_match = re.search(r"\b(?:blood\s*sugar|glucose|fbs|rbs)\s*[:=]?\s*(\d{2,3})\s*(?:mg/dl)?\b", low)
    if bg_match:
        try:
            bg_val = int(bg_match.group(1))
            if 30 <= bg_val <= 600:
                flag = "NORMAL"
                if bg_val >= 250 or bg_val < 60:
                    flag = "CRITICAL_HIGH" if bg_val >= 250 else "CRITICAL_LOW"
                elif bg_val > 140:
                    flag = "HIGH"
                elif bg_val < 70:
                    flag = "LOW"
                results.append({
                    "metric": "Blood Glucose",
                    "value": str(bg_val),
                    "unit": "mg/dL",
                    "flag": flag,
                    "reference_range": "70 - 140 mg/dL"
                })
        except ValueError:
            pass

    return results


def analyze_patient_case(
    patient_name: str,
    age: int,
    chief_complaint: str,
    symptoms: str,
    symptom_duration: str,
    medical_history: str = "",
    current_medications: str = "",
    additional_notes: str = "",
) -> Tuple[Dict[str, Any], List[Dict[str, Any]], bool]:
    """
    Analyzes raw patient intake data to produce:
    - Structured case summary with parsed medications & extracted vitals
    - List of transparent warning flags
    - Emergency flag indicator boolean
    """
    combined_text = f"{chief_complaint} {symptoms} {medical_history} {additional_notes}".lower()
    warning_flags: List[Dict[str, Any]] = []

    # 1. Cardiovascular / Acute Coronary Warning Rules
    cardio_triggers = [
        "chest pain", "chest pressure", "chest tightness", "radiating to arm",
        "radiating to jaw", "left arm pain", "heart attack", "crushing chest"
    ]
    matched_cardio = [t for t in cardio_triggers if t in combined_text]
    if matched_cardio:
        warning_flags.append({
            "id": "CARDIO_RED_FLAG",
            "severity": "critical",
            "title": "Potential Acute Coronary / Cardiac Warning",
            "description": f"Patient reported: '{', '.join(matched_cardio)}'. Cardiac red flags require immediate clinical assessment.",
            "guidance": "Seek immediate emergency medical evaluation (e.g. Call Emergency Services 911 / 112 or visit nearest Emergency Department). Do not drive oneself."
        })

    # 2. Acute Neurological / Stroke Warning Rules (FAST)
    neuro_triggers = [
        "face drooping", "facial droop", "slurred speech", "unable to speak",
        "sudden weakness", "arm weakness", "sudden numbness", "loss of vision",
        "sudden paralysis", "worst headache of life", "thunderclap headache"
    ]
    matched_neuro = [t for t in neuro_triggers if t in combined_text]
    if matched_neuro:
        warning_flags.append({
            "id": "NEURO_STROKE_FLAG",
            "severity": "critical",
            "title": "Acute Neurological / Stroke Warning Signs",
            "description": f"Patient reported: '{', '.join(matched_neuro)}'. Symptoms may indicate acute stroke or intracranial event.",
            "guidance": "Immediate emergency evaluation is imperative. Time-sensitive intervention required."
        })

    # 3. Severe Respiratory Distress Rules
    resp_triggers = [
        "severe shortness of breath", "can't breathe", "cannot breathe",
        "gasping", "blue lips", "cyanosis", "stridor", "suffocating"
    ]
    matched_resp = [t for t in resp_triggers if t in combined_text]
    if matched_resp:
        warning_flags.append({
            "id": "RESP_DISTRESS_FLAG",
            "severity": "critical",
            "title": "Severe Respiratory Distress Warning",
            "description": f"Patient reported: '{', '.join(matched_resp)}'. Compromised airway or acute hypoxia risk.",
            "guidance": "Immediate emergency care required. Monitor oxygenation and respiratory effort."
        })

    # 4. Severe Sepsis / Meningeal Signs
    sepsis_triggers = [
        "stiff neck", "high fever with confusion", "non-blanching rash",
        "unresponsive", "fever and confusion"
    ]
    matched_sepsis = [t for t in sepsis_triggers if t in combined_text]
    if matched_sepsis:
        warning_flags.append({
            "id": "ACUTE_INFECTION_FLAG",
            "severity": "critical",
            "title": "Severe Infection / Meningeal Warning Signs",
            "description": f"Patient reported: '{', '.join(matched_sepsis)}'. Risk of severe acute infection or meningitis.",
            "guidance": "Urgent in-person emergency physician evaluation advised."
        })

    # 5. Severe Trauma / Active Bleeding
    bleeding_triggers = [
        "coughing up blood", "vomiting blood", "rectal bleeding", "black tarry stool",
        "uncontrolled bleeding", "severe trauma", "head injury"
    ]
    matched_bleeding = [t for t in bleeding_triggers if t in combined_text]
    if matched_bleeding:
        warning_flags.append({
            "id": "HEMORRHAGE_FLAG",
            "severity": "critical",
            "title": "Active Bleeding / Severe Trauma Warning",
            "description": f"Patient reported: '{', '.join(matched_bleeding)}'. Requires immediate medical triage.",
            "guidance": "Emergency department evaluation recommended to prevent acute hypovolemia or intracranial complication."
        })

    # 6. Extracted Vitals & Lab Flags
    extracted_vitals = extract_vitals_and_labs(combined_text)
    for v in extracted_vitals:
        if v["flag"] == "CRITICAL_LOW" and "Oxygen" in v["metric"]:
            warning_flags.append({
                "id": "HYPOXIA_CRITICAL_FLAG",
                "severity": "critical",
                "title": "Severe Hypoxia Warning (SpO2 < 92%)",
                "description": f"Reported SpO2 is {v['value']}%. Low oxygen saturation indicates acute respiratory compromise.",
                "guidance": "Immediate emergency evaluation and oxygen therapy assessment recommended."
            })
        elif v["flag"] == "CRITICAL_HIGH" and "Blood Pressure" in v["metric"]:
            warning_flags.append({
                "id": "HYPERTENSIVE_CRISIS_FLAG",
                "severity": "critical",
                "title": "Hypertensive Crisis Range Alert (BP ≥ 180/120 mmHg)",
                "description": f"Reported blood pressure is {v['value']} mmHg. Risk of acute end-organ damage.",
                "guidance": "Urgent medical assessment advised to rule out hypertensive emergency."
            })
        elif v["flag"] == "CRITICAL_HIGH" and "Temperature" in v["metric"]:
            warning_flags.append({
                "id": "HYPERPYREXIA_FLAG",
                "severity": "warning",
                "title": "Severe Hyperpyrexia Alert (Temp ≥ 103°F / 39.5°C)",
                "description": f"Reported temperature is {v['value']}{v['unit']}. Elevated temperature warrants prompt clinician assessment.",
                "guidance": "In-person evaluation and antipyretic management advised."
            })

    # 7. Moderate / Advisory Warnings: Vulnerable Age or Polypharmacy
    parsed_meds = parse_structured_medications(current_medications)
    med_count = len(parsed_meds)
    if med_count >= 5:
        warning_flags.append({
            "id": "POLYPHARMACY_ADVISORY",
            "severity": "warning",
            "title": "Polypharmacy Risk (≥ 5 Reported Medications)",
            "description": f"Patient reports {med_count} concurrent medications. Review for drug-drug interactions, contraindications, and adherence.",
            "guidance": "Clinician medication reconciliation recommended during consultation."
        })

    if age >= 75:
        warning_flags.append({
            "id": "GERIATRIC_RISK_ADVISORY",
            "severity": "advisory",
            "title": "Geriatric Vulnerability Factor",
            "description": f"Patient age ({age}) warrants heightened vigilance for atypical presentation of acute conditions and fall risk.",
            "guidance": "Verify baseline cognitive status, mobility, and caregiver support."
        })
    elif age < 2:
        warning_flags.append({
            "id": "PEDIATRIC_VULNERABILITY",
            "severity": "warning",
            "title": "Infant / Pediatric Assessment Priority",
            "description": f"Patient is an infant ({age} years). Pediatric patients require rapid clinical assessment due to rapid decompensation risks.",
            "guidance": "Prompt in-person pediatric evaluation recommended."
        })

    # 8. Missing Information Detection (Prompts for Clinician to Clarify)
    missing_info: List[str] = []
    
    # Check if pain score / severity was mentioned
    if any(w in combined_text for w in ["pain", "ache", "sore", "hurts"]):
        if not re.search(r'\b([0-9]|10)\s*(/|\s*out of\s*)\s*10\b', combined_text):
            missing_info.append("Pain severity rating (e.g. 1-10 numerical scale) not specified by patient.")
    
    # Check if allergies were documented
    if not medical_history or not any(w in medical_history.lower() for w in ["allergic", "allergy", "nkda", "no known"]):
        missing_info.append("Known medication and environmental allergies not explicitly documented.")
        
    # Check if medication dosages / frequency are present
    if current_medications.strip():
        meds_lacking_freq = [m["name"] for m in parsed_meds if not m["frequency"]]
        if meds_lacking_freq:
            missing_info.append(f"Medication dosing frequency omitted for: {', '.join(meds_lacking_freq[:3])}")
    
    # Check if onset speed is clear
    dur_lower = symptom_duration.lower()
    if not any(w in dur_lower for w in ["sudden", "gradual", "abrupt", "hours", "days", "weeks", "months", "years"]):
        missing_info.append("Symptom onset character (abrupt vs gradual progression) requires clinician clarification.")

    # Check for systemic review questions (fever, weight loss, appetite)
    if "fever" not in combined_text and "temperature" not in combined_text:
        missing_info.append("Presence or absence of fever/chills unconfirmed.")

    has_emergency_flags = any(f["severity"] == "critical" for f in warning_flags)

    # Structured summary strictly from patient input
    structured_summary = {
        "title": "Automated Clinical Case Summary (Draft for Clinician Review)",
        "chief_complaint": chief_complaint.strip(),
        "reported_symptoms": symptoms.strip(),
        "symptom_duration": symptom_duration.strip(),
        "relevant_history": medical_history.strip() if medical_history.strip() else "None reported by patient",
        "current_medications": current_medications.strip() if current_medications.strip() else "None reported by patient",
        "additional_notes": additional_notes.strip() if additional_notes.strip() else "None provided",
        "parsed_medications": parsed_meds,
        "extracted_vitals_and_labs": extracted_vitals,
        "missing_information": missing_info,
        "clinical_disclaimer": (
            "This draft summary is automatically organized strictly from patient-reported input "
            "and is intended exclusively to support clinician review. It does not constitute a "
            "medical diagnosis or treatment plan."
        )
    }

    return structured_summary, warning_flags, has_emergency_flags
