import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { PatientIntake } from './components/PatientIntake';
import { DoctorDashboard } from './components/DoctorDashboard';
import { api } from './services/api';
import { ClinicalCase } from './types/case';
import { Stethoscope } from './components/Icons';

export function App() {
  const [activeView, setActiveView] = useState<'intake' | 'dashboard'>('intake');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  // Poll backend health and stats periodically
  useEffect(() => {
    let isMounted = true;

    const checkStatus = async () => {
      try {
        await api.checkHealth();
        const stats = await api.getStats();
        if (isMounted) {
          setIsBackendConnected(true);
          setPendingCount(stats.pending);
        }
      } catch {
        if (isMounted) {
          setIsBackendConnected(false);
        }
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCaseSubmitted = (newCase: ClinicalCase) => {
    setPendingCount((prev) => prev + 1);
    setSelectedCaseId(newCase.id);
  };

  const handleNavigateToDashboard = () => {
    setActiveView('dashboard');
  };

  const handleNavigateToIntake = () => {
    setActiveView('intake');
  };

  return (
    <div className="app-container">
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        pendingCount={pendingCount}
        isBackendConnected={isBackendConnected}
      />

      <main className="main-content">
        {activeView === 'intake' ? (
          <PatientIntake
            onCaseSubmitted={handleCaseSubmitted}
            onNavigateToDashboard={handleNavigateToDashboard}
          />
        ) : (
          <DoctorDashboard
            onNavigateToIntake={handleNavigateToIntake}
            selectedCaseId={selectedCaseId}
            onClearSelectedCaseId={() => setSelectedCaseId(null)}
          />
        )}
      </main>

      <footer
        style={{
          borderTop: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          padding: '1.25rem 1rem',
          textAlign: 'center',
          fontSize: '0.785rem',
          color: '#6B7280',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#123B3A', fontWeight: 600 }}>
            <Stethoscope size={16} />
            <span>CLARIO — Health Intelligence</span>
          </div>
          <div>
            From patient stories to clinical clarity. Designed for clinician decision support.
          </div>
          <div style={{ fontStyle: 'italic', color: '#9CA3AF' }}>
            Prototype Demonstration Only • Not for emergency diagnostic use
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
