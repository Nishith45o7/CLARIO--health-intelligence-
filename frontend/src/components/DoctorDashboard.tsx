import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { ClinicalCase, CaseStats } from '../types/case';
import { api } from '../services/api';
import { CaseDetailModal } from './CaseDetailModal';
import {
  Inbox,
  Clock,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Search,
  RefreshCw,
  Eye,
  Sparkles,
  AlertCircle
} from './Icons';

interface DoctorDashboardProps {
  onNavigateToIntake: () => void;
  selectedCaseId?: string | null;
  onClearSelectedCaseId?: () => void;
}

// Pure date formatting helper to preserve React compiler purity
function formatRelativeTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return isoString;
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return isoString;
  }
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  onNavigateToIntake,
  selectedCaseId,
  onClearSelectedCaseId,
}) => {
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCase, setSelectedCase] = useState<ClinicalCase | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const [fetchedCases, fetchedStats] = await Promise.all([
        api.getCases(),
        api.getStats(),
      ]);
      setCases(fetchedCases);
      setStats(fetchedStats);

      // If a specific case ID was requested from intake or direct link, select it
      if (selectedCaseId) {
        const found = fetchedCases.find((c) => c.id === selectedCaseId);
        if (found) {
          setSelectedCase(found);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to CLARIO backend on port 8000.';
      console.error('Failed to load doctor dashboard data:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [fetchedCases, fetchedStats] = await Promise.all([
          api.getCases(),
          api.getStats(),
        ]);
        if (!ignore) {
          setCases(fetchedCases);
          setStats(fetchedStats);
          if (selectedCaseId) {
            const found = fetchedCases.find((c) => c.id === selectedCaseId);
            if (found) setSelectedCase(found);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Unable to connect to CLARIO backend on port 8000.';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [selectedCaseId]);

  const handleSeedDemo = async () => {
    try {
      setIsRefreshing(true);
      await api.seedDemoCases();
      await fetchDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reseed database.';
      console.error('Failed to seed demo cases:', err);
      setError(msg);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleStatusUpdated = (updatedCase: ClinicalCase) => {
    setCases((prev) =>
      prev.map((c) => (c.id === updatedCase.id ? updatedCase : c))
    );
    // Refresh stats
    api.getStats().then(setStats).catch(() => {});
  };

  // Filtered and searched cases (using deferred query for maximum UI efficiency)
  const filteredCases = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().trim();
    return cases.filter((c) => {
      // Status filter
      if (statusFilter === 'critical') {
        if (!c.has_emergency_flags) return false;
      } else if (statusFilter !== 'all') {
        if (c.status !== statusFilter) return false;
      }

      // Search query
      if (q) {
        const matchesId = c.id.toLowerCase().includes(q);
        const matchesName = c.patient_name.toLowerCase().includes(q);
        const matchesComplaint = c.chief_complaint.toLowerCase().includes(q);
        const matchesSymptoms = c.symptoms.toLowerCase().includes(q);
        return matchesId || matchesName || matchesComplaint || matchesSymptoms;
      }

      return true;
    });
  }, [cases, statusFilter, deferredSearchQuery]);

  return (
    <div>
      {/* Dashboard Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#123B3A', marginBottom: '0.25rem' }}>
            Clinician Triage & Case Workstation
          </h1>
          <p style={{ color: '#4B5563', fontSize: '0.9rem' }}>
            Real-time patient intake queue, structured clinical summaries, and red-flag alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            id="btn-refresh-dashboard"
            className="btn btn-secondary btn-sm"
            onClick={fetchDashboardData}
            disabled={isRefreshing}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spinner' : ''} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Queue'}</span>
          </button>

          <button
            type="button"
            id="btn-reseed-cases"
            className="btn btn-secondary btn-sm"
            onClick={handleSeedDemo}
            title="Reload synthetic test patients into SQLite"
            disabled={isRefreshing}
          >
            <Sparkles size={14} style={{ color: '#1E7B61' }} />
            <span>Reload Synthetic Seeds</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="red-flag-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={20} className="red-flag-icon" />
          <div className="red-flag-content">
            <h4>Connection Error</h4>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#D7F3E8', color: '#123B3A' }}>
            <Inbox size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{stats ? stats.total : cases.length}</span>
            <span className="stat-label">Total Cases</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" id="stat-pending-count">
              {stats ? stats.pending : cases.filter((c) => c.status === 'pending').length}
            </span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#DBEAFE', color: '#1E40AF' }}>
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {stats ? stats.in_review : cases.filter((c) => c.status === 'in_review').length}
            </span>
            <span className="stat-label">In Clinical Review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">
              {stats ? stats.completed : cases.filter((c) => c.status === 'completed').length}
            </span>
            <span className="stat-label">Review Completed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
            <ShieldAlert size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value" id="stat-critical-count">
              {stats ? stats.critical_warning_count : cases.filter((c) => c.has_emergency_flags).length}
            </span>
            <span className="stat-label">Safety Flags</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '1rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '420px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF',
            }}
          />
          <input
            type="text"
            id="case-search-input"
            className="form-input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
            placeholder="Search by case ID, patient name, chief complaint..."
            aria-label="Search by case ID, patient name, chief complaint, or symptoms"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }} role="toolbar" aria-label="Case status filters">
          {[
            { id: 'all', label: 'All Cases' },
            { id: 'pending', label: 'Pending' },
            { id: 'in_review', label: 'In Review' },
            { id: 'completed', label: 'Completed' },
            { id: 'critical', label: 'Safety Flags' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              id={`filter-tab-${tab.id}`}
              className={`btn btn-sm ${statusFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              aria-pressed={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.id === 'critical' && <ShieldAlert size={14} aria-hidden="true" />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cases Queue Table */}
      {isLoading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '28px', height: '28px' }} />
          <p style={{ color: '#4B5563', fontSize: '0.9rem' }}>Loading clinical triage cases from SQLite...</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Inbox size={28} />
          </div>
          <h3>No matching patient cases found</h3>
          <p>
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or filter options.'
              : 'The clinical triage queue is empty. Submit a new case from the patient intake portal.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onNavigateToIntake}
          >
            <span>Open Patient Intake</span>
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="clario-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Patient</th>
                <th>Chief Complaint</th>
                <th>Duration</th>
                <th>Flags</th>
                <th>Status</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => (
                <tr key={c.id} id={`case-row-${c.id}`}>
                  <td>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: '#123B3A',
                        backgroundColor: '#F3FAF6',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #D8E7DF',
                        fontSize: '0.8rem',
                      }}
                    >
                      {c.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{c.patient_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Age: {c.age} yrs</div>
                  </td>
                  <td style={{ maxWidth: '280px' }}>
                    <div
                      style={{
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={c.chief_complaint}
                    >
                      {c.chief_complaint}
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.symptoms}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#374151' }}>{c.symptom_duration}</span>
                  </td>
                  <td>
                    {c.has_emergency_flags ? (
                      <span className="badge badge-urgent" title="Urgent safety warning rule triggered">
                        <ShieldAlert size={12} />
                        <span>Critical Flag</span>
                      </span>
                    ) : c.warning_flags.length > 0 ? (
                      <span className="badge badge-advisory" title="Advisory risk factor detected">
                        <span>{c.warning_flags.length} Advisory</span>
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    {c.status === 'pending' && <span className="badge badge-pending">Pending</span>}
                    {c.status === 'in_review' && <span className="badge badge-in-review">In Review</span>}
                    {c.status === 'completed' && <span className="badge badge-completed">Completed</span>}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.785rem', color: '#6B7280' }}>
                      {formatRelativeTime(c.created_at)}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      id={`btn-review-${c.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedCase(c)}
                    >
                      <Eye size={14} />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedCase && (
        <CaseDetailModal
          caseData={selectedCase}
          onClose={() => {
            setSelectedCase(null);
            if (onClearSelectedCaseId) onClearSelectedCaseId();
          }}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
};
