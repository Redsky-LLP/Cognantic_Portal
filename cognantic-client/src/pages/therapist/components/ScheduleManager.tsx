// ─────────────────────────────────────────────────────────────────
// src/pages/therapist/components/ScheduleManager.tsx
// Calendar day-picker + session list + start/end actions + meet-link
// editor. Extracted verbatim from TherapistPage – no logic changed.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import {
  clinicianService,
  type PlannerResponse,
  type PlannedSession,
} from '../../../services/clinicianService'
import { sessionService } from '../../../services/sessionService'
import { videoService } from '../../../services/videoService'
import LoadingSpinner from '../../../components/LoadingSpinner'

const BRAND = {
  forest:  '#39786A',
  warning: '#f59e0b',
  success: '#10b981',
  sage:    '#9AA57B',
} as const

function getSessionStyle(status: string) {
  if (status === 'Cancelled')
    return { bg: 'rgba(226,232,240,0.3)', border: '#e2e8f0', timeColor: '#94a3b8', nameColor: '#94a3b8' }
  if (status === 'Completed')
    return { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.18)', timeColor: BRAND.success, nameColor: '#1e293b' }
  return { bg: 'rgba(57,120,106,0.07)', border: 'rgba(57,120,106,0.18)', timeColor: BRAND.forest, nameColor: '#1e293b' }
}

// ── Block Personal Time Modal ─────────────────────────────────────
const BlockModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    className="overlay"
    onClick={e => { if (e.target === e.currentTarget) onClose() }}
  >
    <div
      className="animate-scale-in"
      style={{
        background: 'white', borderRadius: 28, padding: '48px',
        width: '100%', maxWidth: 440,
        boxShadow: '0 40px 96px -20px rgba(28,28,30,0.28)',
      }}
    >
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>
        Manage Availability
      </h3>
      <p style={{ color: 'var(--n-400)', fontSize: 13, marginBottom: 28 }}>
        Prevent patients from booking specific time slots.
      </p>
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="label">Reason</label>
        <select className="input">
          <option>Personal Time</option>
          <option>External Clinical Work</option>
          <option>Training / Conference</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <button className="btn btn-outline btn-full" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-danger btn-full"
          onClick={() => { alert('Slot blocked.'); onClose() }}
        >
          Confirm Block
        </button>
      </div>
    </div>
  </div>
)

// ── ScheduleManager ───────────────────────────────────────────────
interface ScheduleManagerProps {
  clinicianId: string
  onPlannerLoad: (p: PlannerResponse | null) => void
  setSessionResult: (result: any) => void
}

const ScheduleManager: React.FC<ScheduleManagerProps> = ({
  clinicianId, onPlannerLoad, setSessionResult,
}) => {
  const [showBlock,     setShowBlock]     = useState(false)
  const [planner,       setPlanner]       = useState<PlannerResponse | null>(null)
  const [isLoading,     setIsLoading]     = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [selectedDate,  setSelectedDate]  = useState(new Date())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editLinkFor,   setEditLinkFor]   = useState<string | null>(null)
  const [linkValue,     setLinkValue]     = useState('')
  const [activeCallId,  setActiveCallId]  = useState<string | null>(null)  // ← ADDED

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  const fetchPlanner = (date: Date) => {
    if (!clinicianId) return
    setIsLoading(true)
    setError(null)
    clinicianService
      .getPlanner(clinicianId, date.toISOString())
      .then(data => {
        setPlanner(data)
        onPlannerLoad(data)
        setIsLoading(false)
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : 'Failed to load planner'
        setError(msg)
        onPlannerLoad(null)
        setIsLoading(false)
      })
  }

  const handleSessionAction = async (sessionId: string, action: 'start' | 'end') => {
    setActionLoading(sessionId + action)
    try {
      if (action === 'start') {
        await sessionService.startSession(sessionId, clinicianId)
      } else {
        const result = await sessionService.endSession(sessionId, clinicianId)
        setSessionResult(result)
      }
      fetchPlanner(selectedDate)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  useEffect(() => { fetchPlanner(selectedDate) }, [clinicianId])

  const handleDaySelect = (d: Date) => {
    setSelectedDate(d)
    fetchPlanner(d)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--charcoal)' }}>
            Weekly Planner
          </h2>
          <p style={{ color: 'var(--n-400)', fontSize: 13, marginTop: 4 }}>
            {planner
              ? `${planner.dailySessions.length} sessions · ${planner.totalMinutesBooked} min booked`
              : 'Loading…'}
          </p>
        </div>
        <button className="btn btn-forest" onClick={() => setShowBlock(true)}>
          + Block Personal Time
        </button>
      </div>

      {/* Day-strip calendar */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', marginBottom: 28 }} className="scrollbar-hide">
        {weekDays.map(d => {
          const isActive = d.toDateString() === selectedDate.toDateString()
          return (
            <div
              key={d.toISOString()}
              className={`day-pill ${isActive ? 'active' : ''}`}
              onClick={() => handleDaySelect(d)}
            >
              <span style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
                color: isActive ? 'rgba(255,255,255,0.7)' : 'var(--n-400)',
              }}>
                {d.toLocaleDateString('en', { weekday: 'short' })}
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: isActive ? 'white' : 'var(--charcoal)' }}>
                {d.getDate()}
              </span>
            </div>
          )
        })}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && error && (
        <div style={{
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 16, padding: '28px 32px', display: 'flex', gap: 16, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 28 }}>⏳</span>
          <div>
            <h4 style={{ fontWeight: 800, color: 'var(--charcoal)', marginBottom: 6 }}>
              Application Pending Review
            </h4>
            <p style={{ fontSize: 13, color: 'var(--n-400)', lineHeight: 1.6 }}>
              Your clinician profile is awaiting admin approval. Once verified you'll
              be visible to patients and your schedule will appear here.
            </p>
          </div>
        </div>
      )}

      {!isLoading && !error && planner && planner.dailySessions.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--n-400)', fontSize: 14 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          No sessions scheduled for this day.
        </div>
      )}

      {!isLoading && !error && planner && planner.dailySessions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {planner.dailySessions.map((s: PlannedSession) => {
            const style = getSessionStyle(s.status)
            const time  = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            // FIX: use Jitsi room when no manual meetLink is set
            const callUrl = s.meetLink || videoService.getRoomUrl(s.sessionId)
            return (
              <div key={s.sessionId} style={{ borderRadius: 18, background: style.bg, border: `1.5px solid ${style.border}` }}>

                {/* ── Main session row ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 24px' }}>
                  <div style={{ minWidth: 60 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: style.timeColor }}>{time}</div>
                    <div style={{ fontSize: 10, color: 'var(--n-400)', marginTop: 2 }}>50 min</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: style.nameColor }}>{s.patientName}</div>
                    <div style={{ fontSize: 12, color: 'var(--n-400)', marginTop: 3 }}>
                      {s.mrNo} · {s.sessionType}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '4px 12px',
                    borderRadius: 100, letterSpacing: '0.08em',
                    background: s.status === 'Cancelled' ? 'rgba(239,68,68,0.08)' : s.status === 'Completed' ? 'rgba(16,185,129,0.1)' : 'rgba(57,120,106,0.1)',
                    color: s.status === 'Cancelled' ? 'var(--danger)' : s.status === 'Completed' ? BRAND.success : BRAND.forest,
                  }}>
                    {s.status}
                  </span>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginLeft: 8, alignItems: 'center' }}>
                    {s.status === 'Scheduled' && (
                      <button className="btn btn-forest btn-sm"
                        disabled={!!actionLoading}
                        onClick={() => handleSessionAction(s.sessionId, 'start')}>
                        {actionLoading === s.sessionId + 'start' ? '…' : '▶ Start'}
                      </button>
                    )}
                    {s.status === 'InProgress' && (
                      <button className="btn btn-danger btn-sm"
                        disabled={!!actionLoading}
                        onClick={() => handleSessionAction(s.sessionId, 'end')}>
                        {actionLoading === s.sessionId + 'end' ? '…' : '⏹ End'}
                      </button>
                    )}

                    {(s.status === 'Scheduled' || s.status === 'InProgress') && (
                      activeCallId === s.sessionId ? (
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ borderRadius: 10, padding: '0 14px', fontWeight: 700 }}
                          onClick={() => setActiveCallId(null)}
                        >
                          ✕ Leave Call
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            borderColor: BRAND.forest, color: BRAND.forest,
                            borderRadius: 10, padding: '0 14px', fontWeight: 700,
                          }}
                          onClick={() => setActiveCallId(s.sessionId)}
                        >
                          📹 Join Session
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* ── In-App Call Iframe ── */}
                {activeCallId === s.sessionId && (
                  <div style={{ padding: '0 24px 20px' }}>
                    <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
                      <iframe
                        src={callUrl}
                        allow="camera; microphone; fullscreen; display-capture; autoplay"
                        style={{ width: '100%', height: 460, border: 'none', display: 'block' }}
                        title="Session Call"
                      />
                    </div>
                  </div>
                )}

                {/* Inline Meet-link Editor */}
                {editLinkFor === s.sessionId && (
                  <div className="animate-fade-up" style={{ padding: '0 24px 20px' }}>
                    <div style={{ background: 'var(--n-50)', borderRadius: 12, border: '1px solid var(--n-100)', padding: 16 }}>
                      <label className="label" style={{ marginBottom: 8, fontSize: 11 }}>Update Meet Link for {s.patientName}</label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <input className="input" placeholder="https://zoom.us/j/..."
                          value={linkValue} onChange={e => setLinkValue(e.target.value)} style={{ flex: 1, height: 38 }} />
                        <button className="btn btn-forest btn-sm"
                          onClick={async () => {
                            try {
                              await sessionService.updateMeetLink(editLinkFor, linkValue)
                              setEditLinkFor(null)
                              fetchPlanner(selectedDate)
                            } catch (err) { alert('Failed to update link') }
                          }}>Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditLinkFor(null)}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {showBlock && <BlockModal onClose={() => setShowBlock(false)} />}
    </div>
  )
}

export default ScheduleManager