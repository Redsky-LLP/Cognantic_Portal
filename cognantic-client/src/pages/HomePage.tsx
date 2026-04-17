import React from 'react'
import type { ViewType, AuthRole } from '../App'

interface Props {
  openAuth: (role: AuthRole) => void
  setView:  (v: ViewType) => void
}

const STATS = [
  { label: 'Precision Matches',   value: '98.4%',  sub: '↑ 2.1% this week',       subColor: 'var(--success)', accent: 'var(--forest)' },
  { label: 'Network Growth',      value: '12.4K+', sub: 'Verified Identity Nodes', subColor: 'var(--n-400)',   accent: 'var(--sage)'   },
  { label: 'Settlements Cleared', value: '$1.2M+', sub: 'Processed & Verified',    subColor: 'var(--sage)',    dark: true              },
]

const FEATURES = [
  { icon: '🧠', title: 'CBT-Aligned Matching',    desc: 'Algorithm cross-references therapist specialisation with patient narrative vectors.' },
  { icon: '🔒', title: 'Clinical-Grade Privacy',  desc: 'All sessions and data are E2E encrypted. Fully HIPAA-aligned architecture.' },
  { icon: '💳', title: 'Automated Settlements',   desc: 'Therapists receive automated weekly payouts. Zero manual billing overhead.' },
  { icon: '📊', title: 'Progress Tracking',       desc: 'Real-time resilience scoring and session analytics for both patient and clinician.' },
]

const HomePage: React.FC<Props> = ({ openAuth, setView }) => (
  <div className="page">

    {/* ── HERO ── */}
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr',
      gap: 40, alignItems: 'center', marginBottom: 60,
    }}>
      <div>
        {/* Live badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '7px 16px', borderRadius: 'var(--r-full)',
          background: 'rgba(57,120,106,0.1)', color: 'var(--forest)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          marginBottom: 32,
        }}>
          <span className="pulse" style={{
            width: 8, height: 8, background: 'var(--forest)',
            borderRadius: '50%', display: 'inline-block',
          }} />
          Platform Active
        </span>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(42px, 6.5vw, 84px)',
          lineHeight: 0.88, letterSpacing: '-0.01em',
          marginBottom: 28, color: 'var(--charcoal)',
        }}>
          Mental care,<br />
          <em style={{ color: 'var(--forest)', fontStyle: 'italic' }}>reimagined.</em>
        </h1>

        <p style={{
          color: 'var(--n-500)', fontSize: 17, fontWeight: 400,
          lineHeight: 1.75, maxWidth: 420, marginBottom: 44,
        }}>
          The architected platform for clinical excellence, automated
          settlements, and high-precision therapist matching.
        </p>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-forest btn-lg" onClick={() => openAuth('patient')}>
            Get Started
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => setView('admin')}>
            System Health
          </button>
        </div>
      </div>

      {/* Portal cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {([
          { role: 'patient'   as AuthRole, icon: '👤', label: 'Patient Portal',   sub: 'Access your care roadmap & matched therapist.' },
          { role: 'therapist' as AuthRole, icon: '🩺', label: 'Clinician Suite',  sub: 'Manage your practice & automated billing.' },
        ]).map(item => (
          <button
            key={item.role}
            className="card hoverable"
            onClick={() => openAuth(item.role)}
            style={{
              padding: '28px 32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 24,
              border: 'none', textAlign: 'left', width: '100%',
              background: 'white',
            }}
          >
            <div style={{
              width: 68, height: 68, flexShrink: 0,
              background: item.role === 'patient'
                ? 'rgba(57,120,106,0.1)'
                : 'rgba(154,165,123,0.12)',
              borderRadius: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30,
            }}>
              {item.icon}
            </div>
            <div>
              <h3 style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.02em', marginBottom: 5, textTransform: 'uppercase' }}>
                {item.label}
              </h3>
              <p style={{ color: 'var(--n-400)', fontSize: 13, fontWeight: 400 }}>{item.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>

    {/* ── STATS ── */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20, marginBottom: 64 }}>
      {STATS.map(s => (
        <div
          key={s.label}
          className={`card ${s.dark ? 'card-dark' : ''}`}
          style={{
            padding: '36px 40px',
            borderLeft: s.dark ? undefined : `4px solid ${s.accent}`,
          }}
        >
          <div className="label" style={{ color: s.dark ? 'rgba(255,255,255,0.35)' : undefined, marginBottom: 14 }}>
            {s.label}
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 52,
            color: s.dark ? 'white' : 'var(--charcoal)',
            lineHeight: 1,
          }}>
            {s.value}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: s.subColor, textTransform: 'uppercase',
            letterSpacing: '0.15em', marginTop: 14,
          }}>
            {s.sub}
          </div>
        </div>
      ))}
    </div>

    {/* ── FEATURES ── */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 64 }}>
      {FEATURES.map(f => (
        <div key={f.title} className="card" style={{ padding: '32px 28px' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
          <h4 style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, letterSpacing: '-0.01em' }}>
            {f.title}
          </h4>
          <p style={{ color: 'var(--n-400)', fontSize: 13, lineHeight: 1.6, fontWeight: 400 }}>
            {f.desc}
          </p>
        </div>
      ))}
    </div>

    {/* ── PHILOSOPHY ── */}
    <div className="card" style={{
      padding: '72px 60px', textAlign: 'center',
      background: 'rgba(154,165,123,0.05)',
      borderStyle: 'dashed', borderColor: 'rgba(154,165,123,0.4)',
    }}>
      <p className="label" style={{ display: 'flex', justifyContent: 'center', marginBottom: 28, letterSpacing: '0.5em' }}>
        System Philosophy
      </p>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(20px, 2.8vw, 36px)',
        fontStyle: 'italic', fontWeight: 400,
        color: 'var(--charcoal)',
        maxWidth: 700, margin: '0 auto',
        lineHeight: 1.4,
      }}>
        "The architecture of care is the foundation of recovery."
      </h2>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 32, marginTop: 48,
      }}>
        <button className="btn btn-forest btn-lg" onClick={() => openAuth('patient')}>
          Begin Your Journey
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => openAuth('therapist')}>
          Join as Clinician
        </button>
      </div>
    </div>

  </div>
)

export default HomePage