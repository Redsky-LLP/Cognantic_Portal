// ─────────────────────────────────────────────────────────────────
// src/pages/therapist/TherapistPage.tsx
// Root – only handles tab switching and the overtime result modal.
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { type PlannerResponse } from '../../services/clinicianService'
import StatsOverview    from './components/StatsOverview'
import ScheduleManager  from './components/ScheduleManager'
import PatientList      from './components/PatientList'
import EarningsView     from './components/EarningsView'

type Tab = 'schedule' | 'requests' | 'money'

interface Props {
  setView?: (v: any) => void
}

const TherapistPage: React.FC<Props> = ({ setView }) => {
  const [tab,           setTab]           = useState<Tab>('schedule')
  const [planner,       setPlanner]       = useState<PlannerResponse | null>(null)
  const [sessionResult, setSessionResult] = useState<any>(null)

  const clinicianId =
    localStorage.getItem('clinicianId') ??
    localStorage.getItem('userId') ??
    ''

  const vettingStatus   = localStorage.getItem('clinicianVettingStatus') ?? 'Verified'
  const rejectionReason = localStorage.getItem('clinicianRejectionReason') ?? ''

  // ── Rejected state ─────────────────────────────────────────────
  if (vettingStatus === 'Rejected') {
    return (
      <div
        className="page animate-fade-up"
        style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', paddingTop: 80 }}
      >
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 32px', fontSize: 48,
        }}>
          🚫
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--danger)', marginBottom: 16 }}>
          Application Rejected
        </h2>
        <p style={{ color: 'var(--n-500)', fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
          Your clinician application has been reviewed and <strong>rejected</strong> by the Cognantic admin team.
        </p>
        {rejectionReason ? (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '24px 28px', marginBottom: 32, textAlign: 'left' }}>
            <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--danger)', marginBottom: 10 }}>Reason from Admin</p>
            <p style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.7 }}>"{rejectionReason}"</p>
          </div>
        ) : (
          <div style={{ background: 'var(--n-50)', border: '1px solid var(--n-200)', borderRadius: 16, padding: '20px 28px', marginBottom: 32, textAlign: 'left' }}>
            <p style={{ fontSize: 13, color: 'var(--n-400)', lineHeight: 1.6 }}>No specific reason was provided by the admin.</p>
          </div>
        )}
        <div style={{ background: 'var(--n-50)', border: '1px solid var(--n-100)', borderRadius: 16, padding: '20px 28px', marginBottom: 36, textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--charcoal)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Next Steps</p>
          <ul style={{ fontSize: 13, color: 'var(--n-500)', lineHeight: 2, paddingLeft: 20, margin: 0 }}>
            <li>Review the feedback above and prepare updated documentation.</li>
            <li>Click the button below to edit your profile and re-submit for review.</li>
            <li>Contact support at <strong>support@cognantic.com</strong> for appeals.</li>
          </ul>
        </div>

        <button 
          className="btn btn-forest" 
          style={{ width: '100%', padding: '16px 0' }}
          onClick={() => setView?.('clinician-onboarding')}
        >
          EDIT PROFILE & RE-APPLY
        </button>
      </div>
    )
  }

  const clinicianName = planner?.clinicianName ?? ''

  return (
    <div className="page animate-fade-up">
      {/* Stats cards + welcome header */}
      <StatsOverview planner={planner} clinicianName={clinicianName} />

      {/* Tab navigation */}
      <div className="tab-nav">
        {(['schedule', 'requests', 'money'] as Tab[]).map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'money' ? 'Earnings' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'schedule' && (
        <ScheduleManager
          clinicianId={clinicianId}
          onPlannerLoad={setPlanner}
          setSessionResult={setSessionResult}
        />
      )}
      {tab === 'requests' && <PatientList />}
      {tab === 'money'    && <EarningsView clinicianId={clinicianId} />}

      {/* Overtime result modal */}
      {sessionResult && (
        <div className="overlay" onClick={() => setSessionResult(null)}>
          <div
            className="animate-scale-in"
            style={{ background: 'white', borderRadius: 24, padding: 40, maxWidth: 400, width: '100%' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 16 }}>Session Ended</h3>
            <div style={{ fontSize: 14, color: 'var(--n-500)', lineHeight: 2 }}>
              <div>Base Amount: <strong>₹{sessionResult.baseAmount?.toFixed(2)}</strong></div>
              {sessionResult.overtimeMinutes > 0 && (
                <>
                  <div>Overtime: <strong>{sessionResult.overtimeMinutes} min</strong></div>
                  <div>Overtime Charged: <strong style={{ color: 'var(--warning)' }}>₹{sessionResult.overtimeCharged?.toFixed(2)}</strong></div>
                </>
              )}
              <div style={{ borderTop: '1px solid var(--n-100)', paddingTop: 12, marginTop: 8 }}>
                Total: <strong style={{ color: 'var(--forest)', fontSize: 18 }}>₹{sessionResult.totalCharged?.toFixed(2)}</strong>
              </div>
            </div>
            <button className="btn btn-forest" style={{ width: '100%', marginTop: 20 }} onClick={() => setSessionResult(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TherapistPage