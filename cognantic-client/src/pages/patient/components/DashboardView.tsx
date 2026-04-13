// PATH: src/pages/patient/components/DashboardView.tsx
//
// Fixes:
//  1. handleTopUp now calls fetchWallet() after success to re-fetch
//     the actual balance from the API — the previous manual state patch
//     was updating local state but the display wasn't reflecting correctly.
//
//  2. WalletCard's onTopUp prop is wired to fetchWallet() directly
//     so the ModernPaymentUI inside WalletCard can also trigger a refresh.
//
//  3. UpcomingSessionCard already has embedded iframe — no change needed.

import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { patientService, type DashboardResponse } from '../../../services/patientService'
import { sessionService, type UpcomingSession } from '../../../services/sessionService'
import { walletService, type WalletBalance } from '../../../services/walletService'
import LoadingSpinner from '../../../components/LoadingSpinner'
import WalletCard from './WalletCard'
import { initials, fmtSlot, timeUntil } from './shared'
import { videoService } from '../../../services/videoService'


// ── Upcoming Session Card ─────────────────────────────────────────
// Already has embedded iframe — kept as-is
const UpcomingSessionCard: React.FC<{ session: UpcomingSession }> = ({ session }) => {
  const { dateShort, time } = fmtSlot(session.sessionDate)
  const [showCall, setShowCall] = useState(false)

  // FIX: use Jitsi room when no manual meetLink is set
  const callUrl = session.meetLink || videoService.getRoomUrl(session.sessionId)

  return (
    <div style={{
      background: 'white', borderRadius: 20, padding: '20px 24px',
      border: '1.5px solid var(--n-100)', boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 6 }}>
        {timeUntil(session.sessionDate)}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--n-500)', marginBottom: 6 }}>
        {dateShort.toUpperCase()}, {time}
      </div>
      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--charcoal)', marginBottom: 2 }}>
        {session.clinicianName}
      </div>
      <div style={{ fontSize: 12, color: 'var(--n-400)', marginBottom: 16 }}>
        {session.sessionType}
      </div>

      {showCall ? (
        // ── IN-APP EMBEDDED CALL ─────────────────────────────
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
          <iframe
            src={callUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{ width: '100%', height: 460, border: 'none', display: 'block' }}
            title="Session Call"
          />
          <button
            onClick={() => setShowCall(false)}
            style={{
              position: 'absolute', top: 10, right: 10,
              background: '#EF4444', color: 'white', border: 'none',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              fontWeight: 700, fontSize: 12,
            }}
          >
            ✕ Leave Call
          </button>
        </div>
      ) : (
        <button
          className="btn btn-outline btn-sm"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            borderColor: 'var(--forest)', color: 'var(--forest)',
            borderRadius: 12, width: '100%', justifyContent: 'center',
          }}
          onClick={() => setShowCall(true)}
        >
          <span style={{ fontSize: 16 }}>📹</span> Join Session (In-App)
        </button>
      )}
    </div>
  )
}

// ── DashboardView ─────────────────────────────────────────────────
interface DashboardViewProps {
  onFindNew: () => void
}

const DashboardView: React.FC<DashboardViewProps> = ({ onFindNew }) => {
  const { user, logout } = useAuth()
  const [dashboard,        setDashboard]        = useState<DashboardResponse | null>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([])
  const [isLoading,        setIsLoading]        = useState(true)
  const [error,            setError]            = useState<string | null>(null)
  const [energy,           setEnergy]           = useState(72)

  const [wallet,        setWallet]        = useState<WalletBalance | null>(null)
  const [showTopUp,     setShowTopUp]     = useState(false)
  const [topUpAmount,   setTopUpAmount]   = useState('')
  const [topUpLoading,  setTopUpLoading]  = useState(false)

  const patientId =
    localStorage.getItem('patientId') ?? localStorage.getItem('userId') ?? ''

  const fetchDashboard = async () => {
    if (!patientId) return
    try {
      const d = await patientService.getDashboard(patientId)
      setDashboard(d)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    }
  }

  // ✅ FIX: always re-fetch wallet from API (not manual state patch)
  const fetchWallet = async () => {
    if (!patientId) return
    try {
      const w = await walletService.getBalance(patientId)
      setWallet(w)
    } catch {
      setWallet(null)
    }
  }

  useEffect(() => {
    if (!patientId) {
      setError('Patient profile not found. Please complete intake.')
      setIsLoading(false)
      return
    }

    const load = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchDashboard(),
          sessionService.getUpcoming(patientId).then(setUpcomingSessions).catch(() => setUpcomingSessions([])),
          fetchWallet(),
        ])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [patientId])

  // ✅ FIX: call fetchWallet() after top-up instead of manually patching state
  const handleTopUp = async (method: string) => {
    if (!topUpAmount || Number(topUpAmount) <= 0) return
    setTopUpLoading(true)
    try {
      await walletService.topUp({
        userId: patientId,
        amount: Number(topUpAmount),
        paymentMethod: method,
      })
      // Re-fetch fresh balance from API — ensures display matches server truth
      await fetchWallet()
      setShowTopUp(false)
      setTopUpAmount('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Top-up failed')
    } finally {
      setTopUpLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      window.location.reload()
    }
  }

  if (isLoading) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page animate-fade-up" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚠️</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 12 }}>
          Profile Not Found
        </h3>
        <p style={{ color: 'var(--n-400)', fontSize: 14, marginBottom: 28 }}>{error}</p>
      </div>
    )
  }

  const displayName     = dashboard?.fullName ?? user?.name ?? 'Guest'
  const resilienceScore = dashboard?.resilienceScore ?? 0

  return (
    <div className="page animate-fade-up">
      {/* Top Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 40, flexWrap: 'wrap', gap: 20,
      }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--charcoal)', margin: 0 }}>
            Hello, {user?.name?.split(' ')[0] || 'Guest'}
          </h1>
          <p style={{ color: 'var(--n-400)', fontSize: 13, marginTop: 6 }}>
            MR No: <strong style={{ color: 'var(--forest)' }}>{dashboard?.mrNo ?? '—'}</strong>
            {' · '}Resilience Score: <strong style={{ color: 'var(--forest)' }}>{resilienceScore}%</strong>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-outline">Care Plan PDF</button>
          <button className="btn btn-forest" onClick={onFindNew}>
            Find New Clinician
          </button>
          {user && (
            <button
              onClick={handleLogout}
              className="btn"
              style={{
                padding: '11px 20px', background: '#EF4444', color: 'white',
                border: 'none', borderRadius: 22, fontWeight: 700, fontSize: 12,
                letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* ✅ FIX: onTopUp wired to fetchWallet so ModernPaymentUI inside WalletCard
          can trigger a balance refresh after payment completes */}
      <WalletCard
        balance={wallet}
        onTopUp={fetchWallet}
        wallet={wallet}
        showTopUp={showTopUp}
        setShowTopUp={setShowTopUp}
        topUpAmount={topUpAmount}
        setTopUpAmount={setTopUpAmount}
        topUpLoading={topUpLoading}
        handleTopUp={handleTopUp}
        patientId={patientId}
      />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Active Care Roadmap */}
        <div className="card card-dark" style={{ padding: 40, color: 'white' }}>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.3em', opacity: 0.35, marginBottom: 28,
          }}>
            Active Care Roadmap
          </div>

          {dashboard?.activeMatches && dashboard.activeMatches.length > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  border: '3px solid rgba(154,165,123,0.4)',
                  padding: 3, flexShrink: 0,
                }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: 18,
                  }}>
                    {initials(dashboard.activeMatches[0].fullName)}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 5 }}>
                    {dashboard.activeMatches[0].fullName}
                  </h3>
                  {upcomingSessions.length > 0 && (
                    <p style={{ color: 'var(--sage)', fontSize: 12, fontWeight: 600 }}>
                      Next Session:{' '}
                      {(() => {
                        const { dateShort, time } = fmtSlot(upcomingSessions[0].sessionDate)
                        return `${dateShort}, ${time}`
                      })()}
                    </p>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
                borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24,
              }}>
                {[
                  { l: 'Sessions', v: String(dashboard.totalSessions) },
                  { l: 'Status',   v: dashboard.activeMatches[0].matchStatus },
                  { l: 'Score',    v: `${resilienceScore}%` },
                ].map(({ l, v }) => (
                  <div key={l}>
                    <div style={{
                      fontSize: 9, textTransform: 'uppercase', opacity: 0.35,
                      fontWeight: 700, marginBottom: 6, letterSpacing: '0.15em',
                    }}>
                      {l}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ opacity: 0.5, textAlign: 'center', paddingTop: 20, fontSize: 14 }}>
              No active clinician matches yet.{' '}
              <span
                style={{ color: 'var(--sage)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={onFindNew}
              >
                Find a Clinician →
              </span>
            </div>
          )}
        </div>

        {/* Daily Check-in */}
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Daily Check-in
          </h3>
          <p style={{ color: 'var(--n-400)', fontSize: 13, marginBottom: 24 }}>
            How are your energy levels today?
          </p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--n-50)', padding: '16px 18px',
            borderRadius: 18, border: '1px solid var(--n-100)',
          }}>
            <span style={{ fontSize: 22 }}>🔋</span>
            <input
              type="range" min={0} max={100} value={energy}
              onChange={e => setEnergy(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--forest)' }}
            />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--forest)', minWidth: 36 }}>
              {energy}%
            </span>
          </div>

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Sessions Completed', value: String(dashboard?.totalSessions ?? 0), color: 'var(--forest)' },
              { label: 'Active Matches',      value: String(dashboard?.activeMatches?.length ?? 0), color: 'var(--warning)' },
              { label: 'Resilience Score',    value: `${resilienceScore}%`, color: 'var(--info)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--n-400)', fontWeight: 500 }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="card" style={{ padding: '28px 32px', marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h4 style={{ fontWeight: 800, fontSize: 16 }}>Upcoming Sessions</h4>
          {upcomingSessions.length > 0 && (
            <span className="badge badge-live">{upcomingSessions.length} Scheduled</span>
          )}
        </div>
        {upcomingSessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--n-400)', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            No upcoming sessions. Book one with your clinician!
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {upcomingSessions.map(s => <UpcomingSessionCard key={s.sessionId} session={s} />)}
          </div>
        )}
      </div>

      {/* Matched Clinicians strip */}
      {dashboard?.activeMatches && dashboard.activeMatches.length > 0 && (
        <div className="card" style={{ padding: '28px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h4 style={{ fontWeight: 800, fontSize: 16 }}>Your Matched Clinicians</h4>
            <span className="badge badge-live">Active</span>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }} className="scrollbar-hide">
            {dashboard.activeMatches.map(m => (
              <div
                key={m.clinicianId}
                style={{
                  flexShrink: 0, padding: '16px 20px', borderRadius: 20,
                  border: '1.5px solid rgba(57,120,106,0.13)',
                  background: 'rgba(57,120,106,0.04)', minWidth: 210,
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 800, color: 'var(--forest)',
                  textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6,
                }}>
                  {m.matchStatus}
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.fullName}</div>
                <div style={{ fontSize: 11, color: 'var(--n-400)' }}>{m.specialty}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardView