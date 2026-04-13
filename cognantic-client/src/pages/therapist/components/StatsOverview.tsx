// ─────────────────────────────────────────────────────────────────
// src/pages/therapist/components/StatsOverview.tsx
// Top-level stat cards shown at the top of the TherapistPage.
// Extracted verbatim from TherapistPage – no logic changed.
// ─────────────────────────────────────────────────────────────────

import React from 'react'
import { type PlannerResponse } from '../../../services/clinicianService'

const BRAND = {
  forest:  '#39786A',
  warning: '#f59e0b',
  success: '#10b981',
  sage:    '#9AA57B',
} as const

type BrandKey = keyof typeof BRAND

interface StatsOverviewProps {
  planner: PlannerResponse | null
  clinicianName: string
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ planner, clinicianName }) => {
  const todaySessions = planner ? String(planner.dailySessions.length) : '—'

  const STATS: { label: string; value: string; accent?: BrandKey; dark?: boolean }[] = [
    { label: "Today's Sessions", value: todaySessions, accent: 'forest'  },
    { label: 'Pending Requests', value: '—',           accent: 'warning' },
    { label: 'Weekly Payout',    value: '—',           accent: 'success' },
    { label: 'Avg. Match Score', value: '94%',         dark: true        },
  ]

  return (
    <>
      {clinicianName && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--charcoal)', marginBottom: 4 }}>
            Welcome, {clinicianName}
          </h2>
          <p style={{ color: 'var(--n-400)', fontSize: 14 }}>Here's your clinical overview for today.</p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 44 }}>
        {STATS.map(s => (
          <div
            key={s.label}
            className="card"
            style={{
              padding: '28px 24px',
              background: s.dark ? 'var(--charcoal)' : 'white',
              borderLeft: s.dark ? 'none' : `4px solid ${BRAND[s.accent ?? 'sage']}`,
            }}
          >
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em',
              color: s.dark ? 'rgba(255,255,255,0.3)' : 'var(--n-400)', marginBottom: 12,
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em',
              color: s.dark ? BRAND.sage : 'var(--charcoal)',
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default StatsOverview
