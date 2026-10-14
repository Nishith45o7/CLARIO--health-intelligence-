import React, { useState } from 'react';
import { api } from '../services/api';
import { CaseCreateInput, ClinicalCase } from '../types/case';
import {
  FileText,
  User,
  HeartPulse,
  Pill,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Clock
} from './Icons';

interface PatientIntakeProps {
  onCaseSubmitted: (newCase: ClinicalCase) => void;
  onNavigateToDashboard: () => void;
}

interface FormErrors {
  patient_name?: string;
  age?: string;
  chief_complaint?: string;
  symptoms?: string;
  symptom_duration?: string;
}

const PRESET_CASES: Array<{
  name: string;
  label: string;
  data: CaseCreateInput;
}> = [
  {
    name: 'cardiac',
    label: 'Preset: Chest Pressure (Red Flag Demo)',
    data: {
      patient_name: 'Robert Hastings [Synthetic Demo]',
      age: 58,
      chief_complaint: 'Substernal chest pressure and shortness of breath when walking up stairs',
      symptoms: 'Heaviness in center of chest that radiates into left jaw and left arm. Onset 3 hours ago during yard work. Accompanied by mild diaphoresis and shortness of breath.',
      symptom_duration: '3 hours, worsening with activity',
      medical_history: 'Hypertension (10 years), elevated LDL cholesterol. Smoked 1 pack/day for 20 years, quit 5 years ago. No prior heart surgery.',
      current_medications: 'Lisinopril 20mg daily, Atorvastatin 40mg nightly, Aspirin 81mg daily',
      additional_notes: 'Patient felt dizzy when sitting down. States pain feels like "an elephant sitting on chest".'
    }
  },
  {
    name: 'respiratory',
    label: 'Preset: Persistent Cough & Fever',
    data: {
      patient_name: 'Amara Okafor [Synthetic Demo]',
      age: 34,
      chief_complaint: 'Persistent dry hacky cough and fever spikes up to 101.4 F',
      symptoms: 'Frequent coughing spells that disrupt sleep. Mild retrosternal soreness from coughing. Moderate fatigue, body aches, loss of appetite. No hemoptysis.',
      symptom_duration: '5 days, gradual progression',
      medical_history: 'Childhood asthma (inhaler discontinued 8 years ago). Penicillin allergy (hives).',
      current_medications: 'Over-the-counter Acetaminophen 500mg as needed, Multivitamin once daily',
      additional_notes: 'Co-workers recently had upper respiratory viral illness. Patient works in a busy elementary school.'
    }
  },
  {
    name: 'pediatric',
    label: 'Preset: Infant High Fever (Vulnerability Flag)',
    data: {
      patient_name: 'Baby Lucas Rivera [Synthetic Demo]',
      age: 1,
      chief_complaint: 'High fever of 102.8 F, irritable crying, and decreased fluid intake',
      symptoms: 'Fussy and difficult to console for the past 18 hours. Tugging at right ear. Wet diapers reduced from 6 per day to 2 today. Mild nasal congestion.',
      symptom_duration: '18 hours, acute onset',
      medical_history: 'Born at 39 weeks full term, no previous hospitalizations. Up to date on 12-month immunizations.',
      current_medications: 'Infant Ibuprofen suspension 100mg/5mL given 4 hours ago with partial temperature reduction',
      additional_notes: 'Parents noted no vomiting or diarrhea, but very lethargic when awake.'
    }
  }
];

interface IntakeFormData {
  patient_name: string;
  age: number | '';
  chief_complaint: string;
  symptoms: string;
  symptom_duration: string;
  medical_history: string;
  current_medications: string;
  additional_notes: string;
}

export const PatientIntake: React.FC<PatientIntakeProps> = ({
  onCaseSubmitted,
  onNavigateToDashboard,
}) => {
  const [formData, setFormData] = useState<IntakeFormData>({
    patient_name: '',
    age: '',
    chief_complaint: '',
    symptoms: '',
    symptom_duration: '',
    medical_history: '',
    current_medications: '',
    additional_notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedCase, setSubmittedCase] = useState<ClinicalCase | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'age' ? (value === '' ? '' : parseInt(value, 10)) : value,
    }));

    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const loadPreset = (preset: CaseCreateInput) => {
    setFormData({
      patient_name: preset.patient_name,
      age: preset.age,
      chief_complaint: preset.chief_complaint,
      symptoms: preset.symptoms,
      symptom_duration: preset.symptom_duration,
      medical_history: preset.medical_history || '',
      current_medications: preset.current_medications || '',
      additional_notes: preset.additional_notes || '',
    });
    setErrors({});
    setSubmitError(null);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.patient_name || formData.patient_name.trim().length < 2) {
      newErrors.patient_name = 'Please provide patient full name or synthetic demo identifier.';
    }

    const ageNum = Number(formData.age);
    if (formData.age === '' || isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
      newErrors.age = 'Please enter a valid age between 0 and 125.';
    }

    if (!formData.chief_complaint || formData.chief_complaint.trim().length < 3) {
      newErrors.chief_complaint = 'Please specify the primary reason or main symptom for this consultation.';
    }

    if (!formData.symptoms || formData.symptoms.trim().length < 5) {
      newErrors.symptoms = 'Please describe the symptoms in detail (at least 5 characters).';
    }

    if (!formData.symptom_duration || formData.symptom_duration.trim().length < 2) {
      newErrors.symptom_duration = 'Please provide the duration of symptoms (e.g. 3 days, 2 hours).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CaseCreateInput = {
        patient_name: formData.patient_name.trim(),
        age: Number(formData.age),
        chief_complaint: formData.chief_complaint.trim(),
        symptoms: formData.symptoms.trim(),
        symptom_duration: formData.symptom_duration.trim(),
        medical_history: formData.medical_history?.trim() || '',
        current_medications: formData.current_medications?.trim() || '',
        additional_notes: formData.additional_notes?.trim() || '',
      };

      const result = await api.createCase(payload);
      setSubmittedCase(result);
      onCaseSubmitted(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit case. Please ensure backend server on port 8000 is running.';
      console.error('Case submission error:', err);
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNew = () => {
    setSubmittedCase(null);
    setFormData({
      patient_name: '',
      age: '',
      chief_complaint: '',
      symptoms: '',
      symptom_duration: '',
      medical_history: '',
      current_medications: '',
      additional_notes: '',
    });
    setErrors({});
    setSubmitError(null);
  };

  // If case successfully submitted, show clear success view with returned case ID
  if (submittedCase) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#D1FAE5',
              color: '#059669',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h2 style={{ fontSize: '1.6rem', color: '#123B3A', marginBottom: '0.5rem' }}>
            Case Successfully Registered & Structured
          </h2>
          <p style={{ color: '#4B5563', fontSize: '0.95rem', maxWidth: '540px', margin: '0 auto 1.5rem' }}>
            The clinical intake has been verified and saved to the SQLite persistent database. The case has been routed to the doctor triage queue.
          </p>

          <div
            style={{
              backgroundColor: '#F7FAF8',
              border: '1px solid #D8E7DF',
              borderRadius: '12px',
              padding: '1.25rem',
              maxWidth: '480px',
              margin: '0 auto 1.75rem',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>ASSIGNED CASE ID</span>
              <span
                id="submitted-case-id"
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: '#123B3A',
                  fontFamily: 'monospace',
                  backgroundColor: '#D7F3E8',
                  padding: '0.15rem 0.6rem',
                  borderRadius: '6px',
                }}
              >
                {submittedCase.id}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>PATIENT</span>
              <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 600 }}>
                {submittedCase.patient_name} ({submittedCase.age} yrs)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 600 }}>STATUS</span>
              <span className="badge badge-pending">Pending Review</span>
            </div>
            {submittedCase.has_emergency_flags && (
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.6rem 0.85rem',
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <ShieldAlert size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 600 }}>
                  Safety Warning Rules Triggered ({submittedCase.warning_flags.length} flag)
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              id="btn-view-in-dashboard"
              className="btn btn-primary btn-lg"
              onClick={onNavigateToDashboard}
            >
              <span>Open in Doctor Dashboard</span>
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-lg"
              onClick={handleStartNew}
            >
              <span>Submit Another Patient Case</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Intro Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#123B3A', marginBottom: '0.4rem' }}>
          Patient Health Intake
        </h1>
        <p style={{ color: '#4B5563', fontSize: '0.95rem' }}>
          Please provide structured information about your current symptoms and health history. Your responses will be organized into a clinical summary for physician evaluation.
        </p>

        {/* Quick Demo Preset Selection */}
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <Sparkles size={16} style={{ color: '#1E7B61' }} />
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#123B3A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Hackathon Quick Fill Presets
            </span>
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              (Click to populate realistic synthetic patient test cases)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            {PRESET_CASES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                id={`preset-btn-${preset.name}`}
                className="btn btn-secondary btn-sm"
                onClick={() => loadPreset(preset.data)}
                style={{ fontSize: '0.8rem', backgroundColor: '#F7FAF8', borderColor: '#D8E7DF' }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {submitError && (
        <div className="red-flag-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} className="red-flag-icon" />
          <div className="red-flag-content">
            <h4>Submission Error</h4>
            <p>{submitError}</p>
          </div>
        </div>
      )}

      {/* Main Intake Form */}
      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1: Patient Basics */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <User size={20} />
                <span>1. Patient Identification</span>
              </div>
              <div className="card-subtitle">
                Basic demographic information for clinical record matching
              </div>
            </div>
          </div>

          <div className="form-row form-row-3">
            <div className="form-group">
              <label htmlFor="patient_name" className="form-label">
                Patient Name or Synthetic ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="patient_name"
                name="patient_name"
                className={`form-input ${errors.patient_name ? 'error' : ''}`}
                placeholder="e.g. Jane Doe or PT-9281"
                aria-required="true"
                aria-invalid={!!errors.patient_name}
                aria-describedby={errors.patient_name ? 'err-patient_name' : undefined}
                value={formData.patient_name}
                onChange={handleInputChange}
                required
              />
              {errors.patient_name && (
                <div className="form-error" id="err-patient_name" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{errors.patient_name}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="age" className="form-label">
                Age (Years) <span className="required">*</span>
              </label>
              <input
                type="number"
                id="age"
                name="age"
                min="0"
                max="125"
                className={`form-input ${errors.age ? 'error' : ''}`}
                placeholder="e.g. 45"
                aria-required="true"
                aria-invalid={!!errors.age}
                aria-describedby={errors.age ? 'err-age' : undefined}
                value={formData.age}
                onChange={handleInputChange}
                required
              />
              {errors.age && (
                <div className="form-error" id="err-age" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{errors.age}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Clinical Concern & Symptoms */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <HeartPulse size={20} />
                <span>2. Reason for Consultation & Symptoms</span>
              </div>
              <div className="card-subtitle">
                Describe what prompted this visit and how the symptoms feel
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="chief_complaint" className="form-label">
              Chief Complaint <span className="required">*</span>
              <span className="form-label-hint">(Primary symptom or reason in one sentence)</span>
            </label>
            <input
              type="text"
              id="chief_complaint"
              name="chief_complaint"
              className={`form-input ${errors.chief_complaint ? 'error' : ''}`}
              placeholder="e.g. Sudden sharp chest tightness and shortness of breath"
              aria-required="true"
              aria-invalid={!!errors.chief_complaint}
              aria-describedby={errors.chief_complaint ? 'err-chief_complaint' : undefined}
              value={formData.chief_complaint}
              onChange={handleInputChange}
              required
            />
            {errors.chief_complaint && (
              <div className="form-error" id="err-chief_complaint" role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{errors.chief_complaint}</span>
              </div>
            )}
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label htmlFor="symptoms" className="form-label">
                Detailed Reported Symptoms <span className="required">*</span>
                <span className="form-label-hint">(Quality, location, severity, triggers)</span>
              </label>
              <textarea
                id="symptoms"
                name="symptoms"
                rows={4}
                className={`form-textarea ${errors.symptoms ? 'error' : ''}`}
                placeholder="Describe the sensations, location (e.g. radiates to arm, localized), triggers (e.g. exertion, food), and any accompanying issues..."
                aria-required="true"
                aria-invalid={!!errors.symptoms}
                aria-describedby={errors.symptoms ? 'err-symptoms' : undefined}
                value={formData.symptoms}
                onChange={handleInputChange}
                required
              />
              {errors.symptoms && (
                <div className="form-error" id="err-symptoms" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{errors.symptoms}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="symptom_duration" className="form-label">
                Symptom Duration & Onset <span className="required">*</span>
                <span className="form-label-hint">(When did it start? Sudden or gradual?)</span>
              </label>
              <input
                type="text"
                id="symptom_duration"
                name="symptom_duration"
                className={`form-input ${errors.symptom_duration ? 'error' : ''}`}
                placeholder="e.g. 3 hours ago, sudden onset after exertion"
                aria-required="true"
                aria-invalid={!!errors.symptom_duration}
                aria-describedby={errors.symptom_duration ? 'err-symptom_duration' : undefined}
                value={formData.symptom_duration}
                onChange={handleInputChange}
                required
              />
              {errors.symptom_duration && (
                <div className="form-error" id="err-symptom_duration" role="alert">
                  <AlertCircle size={14} aria-hidden="true" />
                  <span>{errors.symptom_duration}</span>
                </div>
              )}

              <div
                style={{
                  marginTop: '0.85rem',
                  padding: '0.75rem',
                  backgroundColor: '#F8FAF9',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#123B3A', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Clock size={14} />
                  <span>Duration Guidance</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.2rem' }}>
                  Specifying exact time and progression helps clinicians differentiate acute emergencies from chronic conditions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Medical History & Medications */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <Pill size={20} />
                <span>3. Medical History & Current Medications</span>
              </div>
              <div className="card-subtitle">
                Prior conditions, known allergies, and current prescription or OTC drugs
              </div>
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label htmlFor="medical_history" className="form-label">
                Relevant Medical History & Allergies
                <span className="form-label-hint">(Optional, e.g. Hypertension, Penicillin allergy)</span>
              </label>
              <textarea
                id="medical_history"
                name="medical_history"
                rows={3}
                className="form-textarea"
                placeholder="List known chronic conditions, previous surgeries, or drug allergies (e.g. Type 2 Diabetes, NKDA)..."
                value={formData.medical_history}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="current_medications" className="form-label">
                Current Medications & Dosages
                <span className="form-label-hint">(Optional, e.g. Metformin 500mg BID)</span>
              </label>
              <textarea
                id="current_medications"
                name="current_medications"
                rows={3}
                className="form-textarea"
                placeholder="List any daily prescriptions, inhalers, vitamins, or supplements currently being taken..."
                value={formData.current_medications}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Additional Patient Context */}
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <div className="card-header">
            <div>
              <div className="card-title">
                <FileText size={20} />
                <span>4. Additional Patient Context</span>
              </div>
              <div className="card-subtitle">
                Lifestyle factors, recent exposures, or questions for the physician
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="additional_notes" className="form-label">
              Additional Notes
              <span className="form-label-hint">(Optional)</span>
            </label>
            <textarea
              id="additional_notes"
              name="additional_notes"
              rows={2}
              className="form-textarea"
              placeholder="e.g. Lives alone, travel history, recent sick contacts, specific concerns..."
              value={formData.additional_notes}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#6B7280', maxWidth: '460px' }}>
            By submitting, your structured responses are securely stored in the clinical intake queue for doctor evaluation.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleStartNew}
              disabled={isSubmitting}
            >
              Clear Form
            </button>
            <button
              type="submit"
              id="submit-case-btn"
              className="btn btn-primary btn-lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner spinner-white" />
                  <span>Processing & Structuring...</span>
                </>
              ) : (
                <>
                  <span>Submit Case for Clinical Review</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
