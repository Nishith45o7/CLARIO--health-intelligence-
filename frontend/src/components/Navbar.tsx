import React from 'react';
import { Stethoscope, User, ClipboardList, Activity } from './Icons';

interface NavbarProps {
  activeView: 'intake' | 'dashboard';
  setActiveView: (view: 'intake' | 'dashboard') => void;
  pendingCount: number;
  isBackendConnected: boolean;
  onRefreshStats?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  setActiveView,
  pendingCount,
  isBackendConnected,
}) => {
  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="brand-section">
            <div className="brand-icon-box" title="CLARIO Health Intelligence">
              <Stethoscope size={22} />
            </div>
            <div>
              <div className="brand-title">
                CLARIO <span style={{ fontWeight: 400, opacity: 0.85, fontSize: '0.9rem' }}>| Health Intelligence</span>
              </div>
              <div className="brand-tagline">
                From patient stories to clinical clarity
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Demo Navigation Switcher */}
            <nav className="nav-tabs" aria-label="Demo Role Navigation" role="tablist">
              <button
                type="button"
                id="nav-btn-intake"
                role="tab"
                aria-selected={activeView === 'intake'}
                className={`nav-tab-btn ${activeView === 'intake' ? 'active' : ''}`}
                onClick={() => setActiveView('intake')}
              >
                <User size={16} aria-hidden="true" />
                <span>Patient Intake</span>
              </button>

              <button
                type="button"
                id="nav-btn-dashboard"
                role="tab"
                aria-selected={activeView === 'dashboard'}
                className={`nav-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveView('dashboard')}
              >
                <ClipboardList size={16} aria-hidden="true" />
                <span>Doctor Dashboard</span>
                {pendingCount > 0 && (
                  <span className="tab-badge" title={`${pendingCount} pending cases`} aria-label={`${pendingCount} pending cases`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Backend connectivity status */}
            <div
              className="backend-indicator"
              role="status"
              title={isBackendConnected ? "Connected to FastAPI localhost:8000" : "Disconnected from backend server"}
            >
              <div className={`status-dot ${isBackendConnected ? 'online' : 'offline'}`} aria-hidden="true" />
              <span>{isBackendConnected ? 'API Online' : 'API Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Clearly labeled demo simulator banner as required by Phase 2/8 */}
      <div className="demo-banner">
        <Activity size={14} style={{ color: '#1E7B61' }} />
        <span>
          <strong>Hackathon Prototype Mode:</strong> Interactive case-taking & clinical documentation assistant. Use role switcher above to navigate.
        </span>
      </div>
    </>
  );
};
