// ─────────────────────────────────────────────────────────────────
// PATH: src/pages/patient/components/shared.tsx
//
// FIX (Bug 5): Avatar now accepts an optional photoUrl prop.
// When photoUrl is provided it renders the photo; otherwise it
// falls back to the existing coloured-initials circle.
// All other primitives are unchanged.
// ─────────────────────────────────────────────────────────────────

import React from 'react'

// ── Types (re-exported for sub-components) ────────────────────────
export type FinderStep  = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type SessionMode = 'video' | 'voice' | 'chat'
export type PayMethod   = 'UPI' | 'Card' | 'NetBanking' | 'Wallet'

export const STEP_LABELS: Record<FinderStep, string> = {
  1: 'Preferences', 2: 'Concerns', 3: 'Matches', 4: 'Schedule',
  5: 'Payment', 6: 'Booking', 7: 'Confirmed'
}

export const STEP_PCT: Record<FinderStep, number> = {
  1: 15, 2: 30, 3: 45, 4: 60, 5: 75, 6: 90, 7: 100
}

// ── Helpers ───────────────────────────────────────────────────────
export const initials = (name?: string) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'

export const fmtSlot = (iso?: string) => {
  if (!iso) return { dateShort: '', time: '', date: '' }
  const d = new Date(iso)
  return {
    dateShort: d.toLocaleDateString([], { month: 'short', day: 'numeric' }),
    date:      d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    time:      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
}

export function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Now'
  const mins = Math.floor(ms / 60000), hours = Math.floor(mins / 60), rem = mins % 60
  return hours > 0 ? `Starts in ${hours}h ${rem}m` : `Starts in ${mins}m`
}

export const todayStr = new Date().toISOString().split('T')[0]

// ── BackBtn ───────────────────────────────────────────────────────
export const BackBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: 40, height: 40, borderRadius: '50%',
      border: '1.5px solid var(--n-200)', background: 'var(--white)',
      cursor: 'pointer', fontSize: 16, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'border-color 0.2s',
    }}
    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--forest)')}
    onMouseOut={e  => (e.currentTarget.style.borderColor = 'var(--n-200)')}
  >
    ←
  </button>
)

// ── Avatar ────────────────────────────────────────────────────────
// ✅ FIX (Bug 5): Added optional photoUrl prop.
// When provided, renders the actual photo (object-fit: cover so it
// fills the circle cleanly). Falls back to the initials circle when
// photoUrl is null / undefined / empty string.
export const Avatar: React.FC<{
  name:      string
  size?:     number
  photoUrl?: string | null
}> = ({ name, size = 64, photoUrl }) => (
  <div
    style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      overflow: 'hidden',
      border: '2px solid rgba(57,120,106,0.25)',
      background: 'linear-gradient(135deg, rgba(154,165,123,0.35), rgba(57,120,106,0.25))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    {photoUrl
      ? (
        <img
          src={photoUrl}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          // If the photo URL is broken, fall through to the onError handler
          // which swaps it out so the container shows initials gracefully.
          onError={e => {
            const img = e.currentTarget
            img.style.display = 'none'
            // Show the sibling initials span
            const sibling = img.nextElementSibling as HTMLElement | null
            if (sibling) sibling.style.display = 'flex'
          }}
        />
      )
      : null
    }
    {/* Initials layer — always rendered, hidden when a valid photo loads */}
    <span
      style={{
        display: photoUrl ? 'none' : 'flex',
        alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '100%',
        fontSize: size * 0.32, fontWeight: 700,
        color: 'var(--forest-dark)',
        fontFamily: 'var(--font-display)',
      }}
    >
      {initials(name)}
    </span>
  </div>
)

// ── Stars ─────────────────────────────────────────────────────────
export const Stars: React.FC<{ v?: number }> = ({ v = 4.8 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
    <span style={{ color: '#f5a623', fontSize: 13, fontWeight: 700 }}>
      ★ {v.toFixed(1)}
    </span>
  </span>
)

// ── Pill ──────────────────────────────────────────────────────────
export const Pill: React.FC<{ text: string }> = ({ text }) => (
  <span
    style={{
      display: 'inline-block', padding: '4px 12px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: 'rgba(154,165,123,0.18)', color: '#6b7a55',
      border: '1px solid rgba(154,165,123,0.28)',
    }}
  >
    {text}
  </span>
)

// ── StepBar ───────────────────────────────────────────────────────
export const StepBar: React.FC<{ step: FinderStep }> = ({ step }) =>
  step < 7 ? (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--forest)' }}>
          Step {step} of 6 · {STEP_LABELS[step]}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--n-400)' }}>
          🔒 Encrypted
        </span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${STEP_PCT[step]}%` }} />
      </div>
    </div>
  ) : null