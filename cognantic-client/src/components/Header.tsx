// ─────────────────────────────────────────────────────────────────
// src/components/Header.tsx  ── UPDATED
//
// Changes:
//  1. Replaced plain text name display with a ProfileChip component
//     (Avatar initials + name + role badge + dropdown menu).
//  2. useAuth() now reads from AuthContext (shared) — Header will
//     update immediately on login/logout without page reload.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react'
import type { ViewType, AuthRole } from '../App'
import { useAuth } from '../hooks/useAuth'

interface Props {
  view: ViewType
  setView: (v: ViewType) => void
  openAuth: (role: AuthRole) => void
}

const LogoMark: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
    <circle cx="18" cy="7"  r="5"    fill="white" />
    <rect   x="2"  y="12" width="24" height="3.5" rx="1.75" fill="white" />
    <circle cx="12" cy="22" r="6"   fill="white" />
  </svg>
)

// ── ProfileChip ────────────────────────────────────────────────────
// Shows avatar initials + name + role badge + dropdown on click.
interface ProfileChipProps {
  user: { name: string; email?: string | null; role: string; avatarUrl?: string | null }
  onLogout: () => void
}

const ProfileChip: React.FC<ProfileChipProps> = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleColors: Record<string, string> = {
    admin: '#E63946',
    therapist: 'var(--forest)',
    patient: '#D4A017',
  }
  const roleColor = roleColors[user.role] ?? 'var(--n-400)'

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Chip trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '5px 12px 5px 5px',
          background: 'white',
          border: `1.5px solid ${open ? 'var(--forest)' : 'var(--n-200)'}`,
          borderRadius: 100, cursor: 'pointer',
          boxShadow: open ? '0 0 0 3px rgba(57,120,106,0.12)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--forest), var(--sage))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
          overflow: 'hidden',
        }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        {/* Name + role */}
        <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)', whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: roleColor,
          }}>
            {user.role}
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--n-400)" strokeWidth="2.5"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: 'white', border: '1px solid var(--n-200)',
          borderRadius: 14, minWidth: 210, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
          animation: 'fadeInDown 0.2s ease both',
        }}>
          {/* User info header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--n-100)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)' }}>{user.name}</div>
            {user.email && (
              <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 2 }}>{user.email}</div>
            )}
          </div>

          {/* Menu items */}
          {[
            { emoji: '👤', label: 'My Profile' },
            { emoji: '⚙️', label: 'Settings' },
            { emoji: '🔔', label: 'Notifications' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '11px 16px',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--charcoal)', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--n-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: 15 }}>{item.emoji}</span>
              {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--n-100)', margin: '4px 0' }} />

          {/* Sign out */}
          <button
            onClick={() => { setOpen(false); onLogout() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '11px 16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--danger)', textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(230,57,70,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// ── Header ─────────────────────────────────────────────────────────
const Header: React.FC<Props> = ({ view, setView, openAuth }) => {
  const { user, logout } = useAuth()

  const navItems = [
    { id: 'home',           label: 'Network'   },
    { id: 'patient-auth',   label: 'Patient'   },
    { id: 'therapist-auth', label: 'Clinician' },
  ]
  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin' })
  }

  const handleNav = (id: string) => {
    if (id === 'patient-auth')    openAuth('patient')
    else if (id === 'therapist-auth') openAuth('therapist')
    else setView(id as ViewType)
  }

  const isActive = (id: string) => {
    if (id === 'patient-auth')    return view === 'patient'
    if (id === 'therapist-auth')  return view === 'therapist'
    return view === id
  }

  const handleLogout = async () => {
    await logout()
    localStorage.removeItem('cognantic_current_view')
    setView('home')
  }

  return (
    <>
      {/* Inject keyframe for dropdown animation */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <header
        className="glass-header"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, width: '100%', zIndex: 1000,
          padding: '0 40px', height: 80,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        <button
          onClick={() => setView('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <div style={{
            width: 42, height: 42, background: 'var(--forest)', borderRadius: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(57,120,106,0.35)', transition: 'transform 0.2s',
          }}>
            <LogoMark size={22} />
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em', color: 'var(--charcoal)' }}>
            COGNANTIC
          </span>
        </button>

        {/* Nav pills */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--n-100)', borderRadius: 50, padding: '5px 6px' }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              style={{
                padding: '8px 20px', borderRadius: 50, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 13,
                border: 'none', transition: 'all 0.2s',
                background: isActive(item.id) ? 'var(--charcoal)' : 'transparent',
                color: isActive(item.id) ? 'white' : 'var(--n-500)',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Auth area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            // ✅ ProfileChip — replaces the old plain text name
            <ProfileChip user={user} onLogout={handleLogout} />
          ) : (
            <>
              <button
                onClick={() => openAuth('patient')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
                  color: 'var(--n-500)', padding: '8px 16px',
                }}
              >
                LOGIN
              </button>
              <button
                onClick={() => openAuth('patient')}
                style={{
                  background: 'var(--forest)', color: 'white', border: 'none',
                  borderRadius: 50, padding: '10px 22px', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 14,
                  boxShadow: '0 2px 8px rgba(57,120,106,0.3)',
                }}
              >
                JOIN NOW
              </button>
            </>
          )}
        </div>
      </header>
    </>
  )
}

export default Header