import React, { useState, useEffect } from 'react';
import { ClinicalCase, CaseStatus } from '../types/case';
import { api } from '../services/api';
import {
  X,
  User,
  Pill,
  FileText,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  Check,
  Activity
} from './Icons';

interface CaseDetailModalProps {
  caseData: ClinicalCase;
  onClose: () => void;
  onStatusUpdated: (updatedCase: ClinicalCase) => void;
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseData,
  onClose,
  onStatusUpdated,
}) => {
  const [currentCase, setCurrentCase] = useState<ClinicalCase>(caseData);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Close on Escape key for WCAG accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStatusChange = async (newStatus: CaseStatus) => {
    if (newStatus === currentCase.status) return;

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      const updated = await api.updateCaseStatus(currentCase.id, newStatus);
      setCurrentCase(updated);
      onStatusUpdated(updated);
      setStatusMessage(`Status successfully updated to "${newStatus.replace('_', ' ').toUpperCase()}".`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to update case status:', err);
      setStatusMessage(`Error: ${err.message || 'Failed to update status'}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadge = (status: CaseStatus) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-pending">Pending Triage</span>;
      case 'in_review':
        return <span className="badge badge-in-review">In Clinical Review</span>;
      case 'completed':
        return <span className="badge badge-completed">Review Completed</span>;
      default:
        return null;
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="case-modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                backgroundColor: '#D7F3E8',
                color: '#123B3A',
                fontWeight: 700,
                fontFamily: 'monospace',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                fontSize: '1rem',
              }}
            >
              {currentCase.id}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <h3 id="case-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#123B3A' }}>
                  {currentCase.patient_name}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
                  Age: {currentCase.age}
                </span>
                {getStatusBadge(currentCase.status)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.15rem' }}>
                Submitted: {formatDateTime(currentCase.created_at)}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Close modal"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Status update feedback alert */}
          {statusMessage && (
            <div
              style={{
                backgroundColor: statusMessage.startsWith('Error') ? '#FEF2F2' : '#ECFDF5',
                color: statusMessage.startsWith('Error') ? '#991B1B' : '#065F46',
                border: `1px solid ${statusMessage.startsWith('Error') ? '#FCA5A5' : '#A7F3D0'}`,
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Safety / Red Flag Alerts */}
          {currentCase.has_emergency_flags && (
            <div className="red-flag-banner">
              <ShieldAlert size={22} className="red-flag-icon" />
              <div className="red-flag-content">
                <h4>CRITICAL SAFETY WARNING TRIGGERED</h4>
                {currentCase.warning_flags
                  .filter((f) => f.severity === 'critical')
                  .map((flag) => (
                    <div key={flag.id} style={{ marginBottom: '0.4rem' }}>
                      <strong>{flag.title}:</strong> {flag.description}
                      {flag.guidance && (
                        <div className="red-flag-guidance">
                          Clinical Guidance: {flag.guidance}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Warning Flags (Non-critical / Advisory) */}
          {currentCase.warning_flags.some((f) => f.severity !== 'critical') && (
            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FCD34D',
                borderLeft: '5px solid #D97706',
                borderRadius: '8px',
                padding: '0.85rem 1.15rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <AlertTriangle size={18} style={{ color: '#D97706' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400E' }}>
                  Clinical Risk Advisory
                </span>
              </div>
              {currentCase.warning_flags
                .filter((f) => f.severity !== 'critical')
                .map((flag) => (
                  <div key={flag.id} style={{ fontSize: '0.825rem', color: '#78350F', marginTop: '0.25rem' }}>
                    <strong>{flag.title}:</strong> {flag.description}
                  </div>
                ))}
            </div>
          )}

          {/* Two-Column Clinical Case Review */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Left Column: Patient-Reported Information */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.75rem',
                  color: '#123B3A',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <User size={16} />
                <span>Patient-Reported Information</span>
              </div>

              <div className="summary-box">
                <div className="summary-label">Chief Complaint</div>
                <div className="summary-text" style={{ fontWeight: 600 }}>
                  {currentCase.chief_complaint}
                </div>
              </div>

              <div className="summary-box">
                <div className="summary-label">Reported Symptoms</div>
                <div className="summary-text">{currentCase.symptoms}</div>
              </div>

              <div className="summary-box">
                <div className="summary-label">Duration & Progression</div>
                <div className="summary-text">
                  <Clock size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  {currentCase.symptom_duration}
                </div>
              </div>

              <div className="summary-box">
                <div className="summary-label">Medical History & Allergies</div>
                <div className="summary-text">
                  {currentCase.medical_history || <span style={{ color: '#9CA3AF' }}>None reported by patient</span>}
                </div>
              </div>

              <div className="summary-box">
                <div className="summary-label">Current Medications</div>
                <div className="summary-text">
                  <Pill size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                  {currentCase.current_medications || <span style={{ color: '#9CA3AF' }}>None reported by patient</span>}
                </div>
                {/* Structured parsed medications (from clinical intelligence parser) */}
                {currentCase.structured_summary.parsed_medications && currentCase.structured_summary.parsed_medications.length > 0 && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {currentCase.structured_summary.parsed_medications.map((med, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#F3F4F6',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#111827' }}>{med.name}</span>
                        {med.dosage && (
                          <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '0.05rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                            {med.dosage}
                          </span>
                        )}
                        {med.frequency && (
                          <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '0.05rem 0.35rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                            {med.frequency}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {currentCase.additional_notes && (
                <div className="summary-box">
                  <div className="summary-label">Additional Patient Notes</div>
                  <div className="summary-text">{currentCase.additional_notes}</div>
                </div>
              )}
            </div>

            {/* Right Column: CLARIO Clinical Intelligence */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.75rem',
                  color: '#123B3A',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <FileText size={16} />
                <span>CLARIO Clinical Intelligence</span>
              </div>

              {/* Structured Summary Draft */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #123B3A',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  marginBottom: '1rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#123B3A', textTransform: 'uppercase' }}>
                    Structured Case Summary (Draft)
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#1E7B61', backgroundColor: '#D7F3E8', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Deterministic
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#1F2937', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  Patient presents with <strong>{currentCase.chief_complaint}</strong> ongoing for <strong>{currentCase.symptom_duration}</strong>.
                  Reported symptom profile includes: {currentCase.symptoms}
                </p>

                <div style={{ fontSize: '0.8rem', color: '#4B5563', borderTop: '1px solid #E5E7EB', paddingTop: '0.65rem' }}>
                  <strong>Background:</strong> {currentCase.medical_history || 'No chronic conditions reported'}.<br />
                  <strong>Active Regimen:</strong> {currentCase.current_medications || 'No active medications noted'}.
                </div>

                <div
                  style={{
                    marginTop: '0.85rem',
                    padding: '0.5rem 0.65rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px',
                    fontSize: '0.725rem',
                    color: '#6B7280',
                    fontStyle: 'italic',
                  }}
                >
                  {currentCase.structured_summary.clinical_disclaimer}
                </div>
              </div>

              {/* Extracted Vitals & Clinical Measurements (adapted from MEDI-KIOSK1 parser) */}
              {currentCase.structured_summary.extracted_vitals_and_labs &&
                currentCase.structured_summary.extracted_vitals_and_labs.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '10px',
                      padding: '1.15rem',
                      marginBottom: '1rem',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem', color: '#123B3A' }}>
                      <Activity size={16} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        Extracted Physiological Vitals & Labs
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                      {currentCase.structured_summary.extracted_vitals_and_labs.map((v, idx) => {
                        const isCrit = v.flag.startsWith('CRITICAL');
                        const isHighLow = v.flag === 'HIGH' || v.flag === 'LOW';
                        const badgeBg = isCrit ? '#FEE2E2' : isHighLow ? '#FEF3C7' : '#D1FAE5';
                        const badgeColor = isCrit ? '#991B1B' : isHighLow ? '#92400E' : '#065F46';
                        return (
                          <div
                            key={idx}
                            style={{
                              border: `1px solid ${isCrit ? '#FCA5A5' : '#E5E7EB'}`,
                              borderRadius: '6px',
                              padding: '0.5rem 0.65rem',
                              backgroundColor: isCrit ? '#FFF5F5' : '#F9FAFB',
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', color: '#6B7280', textTransform: 'uppercase' }}>{v.metric}</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0.2rem 0' }}>
                              {v.value} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#4B5563' }}>{v.unit}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem' }}>
                              <span style={{ color: '#9CA3AF' }}>Ref: {v.reference_range}</span>
                              <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                                {v.flag.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Missing Information Prompts */}
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', color: '#0369A1' }}>
                  <Info size={16} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    Missing Information Prompts (To Clarify)
                  </span>
                </div>

                {currentCase.structured_summary.missing_information &&
                currentCase.structured_summary.missing_information.length > 0 ? (
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#0C4A6E', lineHeight: 1.45 }}>
                    {currentCase.structured_summary.missing_information.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '0.35rem' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.825rem', color: '#0369A1' }}>
                    All standard primary intake parameters supplied by patient.
                  </p>
                )}
              </div>

              {/* Doctor Review Scratchpad */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  padding: '1.15rem',
                }}
              >
                <label htmlFor="doctor-notes" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#123B3A', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  Clinician Triage & Plan Notes
                </label>
                <textarea
                  id="doctor-notes"
                  rows={3}
                  className="form-textarea"
                  style={{ fontSize: '0.85rem' }}
                  placeholder="Record differential considerations, recommended triage level, or immediate orders..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Workflow Status Update Controls */}
        <div className="modal-footer">
          <div style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#4B5563' }}>
              Workflow Status:
            </span>
            {getStatusBadge(currentCase.status)}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {currentCase.status !== 'in_review' && (
              <button
                type="button"
                id="btn-status-in-review"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusChange('in_review')}
                disabled={isUpdatingStatus}
              >
                <span>Mark In Review</span>
              </button>
            )}

            {currentCase.status !== 'completed' && (
              <button
                type="button"
                id="btn-status-completed"
                className="btn btn-mint btn-sm"
                onClick={() => handleStatusChange('completed')}
                disabled={isUpdatingStatus}
              >
                <Check size={16} />
                <span>Mark Completed</span>
              </button>
            )}

            {currentCase.status !== 'pending' && (
              <button
                type="button"
                id="btn-status-pending"
                className="btn btn-secondary btn-sm"
                onClick={() => handleStatusChange('pending')}
                disabled={isUpdatingStatus}
              >
                <span>Reset to Pending</span>
              </button>
            )}

            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
