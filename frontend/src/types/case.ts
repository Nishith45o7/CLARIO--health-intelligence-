export type CaseStatus = 'pending' | 'in_review' | 'completed';

export interface WarningFlag {
  id: string;
  severity: 'critical' | 'warning' | 'advisory';
  title: string;
  description: string;
  guidance?: string;
}

export interface ParsedMedication {
  raw: string;
  name: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  form?: string | null;
}

export interface ExtractedVitalLab {
  metric: string;
  value: string;
  unit: string;
  flag: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL_LOW' | 'CRITICAL_HIGH';
  reference_range?: string;
}

export interface StructuredSummary {
  title: string;
  chief_complaint: string;
  reported_symptoms: string;
  symptom_duration: string;
  relevant_history: string;
  current_medications: string;
  additional_notes: string;
  parsed_medications?: ParsedMedication[];
  extracted_vitals_and_labs?: ExtractedVitalLab[];
  missing_information: string[];
  clinical_disclaimer: string;
}

export interface ClinicalCase {
  id: string;
  patient_name: string;
  age: number;
  chief_complaint: string;
  symptoms: string;
  symptom_duration: string;
  medical_history: string;
  current_medications: string;
  additional_notes: string;
  structured_summary: StructuredSummary;
  warning_flags: WarningFlag[];
  has_emergency_flags: boolean;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface CaseCreateInput {
  patient_name: string;
  age: number;
  chief_complaint: string;
  symptoms: string;
  symptom_duration: string;
  medical_history?: string;
  current_medications?: string;
  additional_notes?: string;
}

export interface CaseStats {
  total: number;
  pending: number;
  in_review: number;
  completed: number;
  critical_warning_count: number;
}
