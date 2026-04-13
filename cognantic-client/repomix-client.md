This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/**/*
- Files matching these patterns are excluded: node_modules, dist, build, .git, package-lock.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
src/api/apiClient.ts
src/App.tsx
src/components/AuthModal.tsx
src/components/EmptyState.tsx
src/components/Header.tsx
src/components/LoadingSpinner.tsx
src/components/SessionExtensionModal.tsx
src/components/Toast.tsx
src/context/AuthContext.tsx
src/hooks/index.ts
src/hooks/useApi.ts
src/hooks/useAuth.ts
src/hooks/useSessionHub.ts
src/main.tsx
src/pages/AdminPage.tsx
src/pages/ClinicianOnboardingForm.tsx
src/pages/HomePage.tsx
src/pages/patient/components/DashboardView.tsx
src/pages/patient/components/FinderFlow.tsx
src/pages/patient/components/FinderSteps.tsx
src/pages/patient/components/ModernPaymentUI.tsx
src/pages/patient/components/shared.tsx
src/pages/patient/components/WalletCard.tsx
src/pages/patient/PatientPage.tsx
src/pages/PatientIntakeForm.tsx
src/pages/therapist/components/EarningsView.tsx
src/pages/therapist/components/PatientList.tsx
src/pages/therapist/components/ScheduleManager.tsx
src/pages/therapist/components/StatsOverview.tsx
src/pages/therapist/TherapistPage.tsx
src/services/adminService.ts
src/services/api.ts
src/services/authService.ts
src/services/clinicianService.ts
src/services/patientService.ts
src/services/sessionService.ts
src/services/videoService.ts
src/services/walletService.ts
src/styles/global.css
src/types/index.ts
src/vite-env.d.ts
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/api/apiClient.ts">
// src/services/apiClient.ts

// 🛡️ Hardcoding it bypasses the .env file completely!
const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7208/api/v1';

let _token: string | null = localStorage.getItem('cognantic_token');

export const setToken = (t: string) => {
  _token = t;
  localStorage.setItem('cognantic_token', t);
};

export const clearToken = () => {
  _token = null;
  localStorage.removeItem('cognantic_token');
};

export const getToken = () => _token;

export interface BackendResult<T> {
  isSuccess: boolean;
  data: T | null;
  error: string | null;
  message: string | null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method ?? 'GET',
    body: options.body,
    headers,
  });

  const text = await res.text();
  let parsed: BackendResult<T> | null = null;

  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    console.error('[apiClient] Non-JSON response:', text);
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  if (!res.ok) {
    const msg = parsed?.error ?? parsed?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }

  if (parsed && parsed.isSuccess === false) {
    throw new Error(parsed.error ?? 'Request failed');
  }

  // Auto-unwraps C# Result<T>.data for your views!
  return (parsed?.data ?? parsed) as T; 
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export default apiClient;
</file>

<file path="src/App.tsx">
// ─────────────────────────────────────────────────────────────────
// src/App.tsx  ── FIXED
//
// Bug fixes applied:
//  1. resolveInitialView() now checks clinicianId/patientId for
//     therapist/patient roles on page-reload (was routing everyone
//     directly to their dashboard, bypassing onboarding checks).
//  2. handleAuthSuccess() same fix — consistent with resolveInitialView.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import AuthModal from './components/AuthModal'
import HomePage from './pages/HomePage'
import PatientPage from './pages/patient/PatientPage'
import PatientIntakeForm from './pages/PatientIntakeForm'
import ClinicianOnboardingForm from './pages/ClinicianOnboardingForm'
import TherapistPage from './pages/therapist/TherapistPage'
import AdminPage from './pages/AdminPage'
import './styles/global.css'

export type ViewType =
  | 'home'
  | 'patient'
  | 'patient-intake'
  | 'clinician-onboarding'
  | 'therapist'
  | 'admin'

export type AuthRole = 'patient' | 'therapist'

// ── Helper: read role from persisted user profile ─────────────────
function getPersistedRole(): string | null {
  try {
    const raw = localStorage.getItem('cognantic_user')
    if (!raw || raw === 'null') return null
    return JSON.parse(raw)?.role ?? null
  } catch {
    return null
  }
}

// ── FIX 1: resolveInitialView ─────────────────────────────────────
// Previously returned 'therapist' / 'patient' based on role alone,
// skipping the onboarding guard entirely on page reload.
// Now mirrors the same clinicianId / patientId checks as
// handleAuthSuccess so the two are always in sync.
function resolveInitialView(): ViewType {
  const role = getPersistedRole()

  // ── Admin: always trust role ──────────────────────────────────────
  if (role === 'admin') return 'admin'

  // ── Therapist: validate clinicianId exists ────────────────────────
  if (role === 'therapist') {
    const hasClinicianProfile = !!localStorage.getItem('clinicianId')
    return hasClinicianProfile ? 'therapist' : 'clinician-onboarding'
  }

  // ── Patient: ALWAYS validate patientId before trusting saved view ─
  if (role === 'patient') {
    const hasPatientProfile = !!localStorage.getItem('patientId')
    return hasPatientProfile ? 'patient' : 'patient-intake'
  }

  // ── No role (logged out) ──────────────────────────────────────────
  const saved = localStorage.getItem('cognantic_current_view') as ViewType | null
  if (saved && saved !== 'home') return saved
  return 'home'
}

const App: React.FC = () => {
  const [view, setView]               = useState<ViewType>(resolveInitialView)
  const [authOpen, setAuthOpen]       = useState(false)
  const [pendingRole, setPendingRole] = useState<AuthRole>('patient')
  const [isResetFlow, setIsResetFlow] = useState(false)
  const [resetEmail, setResetEmail]   = useState('')

  // Handle reset-password deep link: ?email=…
  useEffect(() => {
    const params     = new URLSearchParams(window.location.search)
    const emailParam = params.get('email')
    if (emailParam) {
      setResetEmail(emailParam)
      setIsResetFlow(true)
      setAuthOpen(true)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  const openAuth = (role: AuthRole) => {
    setPendingRole(role)
    setIsResetFlow(false)
    setResetEmail('')
    setAuthOpen(true)
  }

  // ── FIX 2: handleAuthSuccess ──────────────────────────────────
  // Previously the therapist branch was correct here, but
  // resolveInitialView() wasn't checking clinicianId, so after a
  // page-reload the two functions disagreed. Now both are identical.
  const handleAuthSuccess = () => {
    setAuthOpen(false)

    const serverRole = getPersistedRole()
    let targetView: ViewType = 'home'

    if (serverRole === 'admin') {
      targetView = 'admin'
    } else if (serverRole === 'therapist') {
      const hasClinicianProfile = !!localStorage.getItem('clinicianId')
      targetView = hasClinicianProfile ? 'therapist' : 'clinician-onboarding'
    } else {
      // patient (default)
      const hasPatientProfile = !!localStorage.getItem('patientId')
      targetView = hasPatientProfile ? 'patient' : 'patient-intake'
    }

    localStorage.setItem('cognantic_current_view', targetView)
    setView(targetView)
  }

  const renderView = () => {
    switch (view) {
      case 'patient-intake':
        return <PatientIntakeForm setView={setView} />
      case 'clinician-onboarding':
        return <ClinicianOnboardingForm setView={setView} />
      case 'patient':
        return <PatientPage />
      case 'therapist':
        return <TherapistPage setView={setView} />
      case 'admin':
        return <AdminPage />
      default:
        return <HomePage openAuth={openAuth} setView={setView} />
    }
  }

  return (
    <div className="app-root">
      <Header view={view} setView={setView} openAuth={openAuth} />
      <main className="content-viewport" key={view}>
        {renderView()}
      </main>
      {authOpen && (
        <AuthModal
          role={pendingRole}
          initialMode={isResetFlow ? 'reset' : 'login'}
          passedEmail={resetEmail}
          onClose={() => setAuthOpen(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  )
}

export default App
</file>

<file path="src/components/AuthModal.tsx">
import React, { useState, useEffect } from 'react'
import type { AuthRole } from '../App'
import { useAuth } from '../hooks/useAuth'

type AuthMode = 'login' | 'register' | 'forgot' | 'reset'

interface Props {
  role: AuthRole
  initialMode?: AuthMode
  passedEmail?: string
  onClose: () => void
  onSuccess: () => void
}

const LogoMark: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
    <circle cx="18" cy="7" r="5" fill="white" />
    <rect x="2" y="12" width="24" height="3.5" rx="1.75" fill="white" />
    <circle cx="12" cy="22" r="6" fill="white" />
  </svg>
)

// ── Eye icons ────────────────────────────────────────────────────────
const EyeOpen: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosed: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const AuthModal: React.FC<Props> = ({
  role,
  onClose,
  onSuccess,
  initialMode = 'login',
  passedEmail = '',
}) => {
  const { login, register, forgotPassword, resetPassword } = useAuth()

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState(passedEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (mode === 'reset' && passedEmail) {
      setEmail(passedEmail)
      setError(null)
    }
  }, [mode, passedEmail])

  const titles: Record<AuthMode, string> = {
    login: role === 'therapist' ? 'Clinician Suite' : 'Patient Gateway',
    register: 'Create Account',
    forgot: 'Reset Access',
    reset: 'Set New Password',
  }
  const subtitles: Record<AuthMode, string> = {
    login: 'Secure entry to your care architecture.',
    register: 'Initialize your secure clinical profile.',
    forgot: 'Enter your email to receive a recovery link.',
    reset: 'Choose a strong new password for your account.',
  }
  const btnLabels: Record<AuthMode, string> = {
    login: 'Sign In',
    register: 'Create Account',
    forgot: 'Send Recovery Link',
    reset: 'Update Password',
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'forgot') {
        await forgotPassword(email)
        alert('If that email is in our system, a recovery link has been sent.')
        setMode('login')
      } else if (mode === 'register') {
        await register(name, email, password, role)
        alert('Account created! Sign in to continue.')
        setMode('login')
        setPassword('')
      } else if (mode === 'reset') {
        if (password !== confirmPassword) throw new Error('Passwords do not match!')
        if (!email) throw new Error('Email parameter is missing from the recovery link.')
        await resetPassword(email, password)
        alert('Password updated successfully!')
        setMode('login')
        setPassword('')
        setConfirmPassword('')
      } else {
        const res = await login(email, password)
        const serverRole = res?.user?.role
        if (serverRole && serverRole !== 'admin' && serverRole !== role) {
          throw new Error(
            `This account is registered as a ${serverRole}. Please use the correct login panel.`,
          )
        }
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  // ── Reusable eye toggle button ──────────────────────────────────
  const eyeToggleStyle: React.CSSProperties = {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--n-300)',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
    transition: 'color 0.15s',
  }

  return (
    <div
      className="overlay"
      onClick={e => {
        if (e.target === e.currentTarget) {
          e.stopPropagation()
          onClose()
        }
      }}
    >
      <div
        className="animate-scale-in"
        style={{
          background: 'white',
          borderRadius: 'var(--r-xl)',
          padding: '52px 48px',
          width: '100%',
          maxWidth: 440,
          position: 'relative',
          boxShadow: '0 40px 96px -20px rgba(28,28,30,0.28)',
        }}
      >
        {/* Close button */}
        <button
          onClick={e => {
            e.stopPropagation()
            onClose()
          }}
          style={{
            position: 'absolute',
            top: 24,
            right: 28,
            background: 'none',
            border: 'none',
            fontSize: 20,
            color: 'var(--n-300)',
            cursor: 'pointer',
            lineHeight: 1,
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = 'var(--charcoal)')}
          onMouseOut={e => (e.currentTarget.style.color = 'var(--n-300)')}
        >
          ✕
        </button>

        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: 'var(--forest)',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(57,120,106,0.3)',
            }}
          >
            <LogoMark />
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 400,
              color: 'var(--charcoal)',
              marginBottom: 8,
            }}
          >
            {titles[mode]}
          </h3>
          <p style={{ color: 'var(--n-400)', fontSize: 13 }}>{subtitles[mode]}</p>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid #EF4444',
                borderRadius: 'var(--r-md)',
                color: '#EF4444',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {mode === 'register' && (
            <div className="form-group">
              <label className="label">Full Name</label>
              <input
                className="input"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          {mode !== 'reset' && (
            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          )}

          {mode !== 'forgot' && mode !== 'reset' && (
            <div className="form-group">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {mode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    onClick={() => {
                      setError(null)
                      setMode('forgot')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--n-400)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      cursor: 'pointer',
                      transition: 'color 0.15s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--forest)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--n-400)')}
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <>
              {/* ── New Password with eye toggle ── */}
              <div className="form-group">
                <label className="label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={eyeToggleStyle}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--forest)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--n-300)')}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* ── Confirm Password with eye toggle ── */}
              <div className="form-group">
                <label className="label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    style={eyeToggleStyle}
                    onMouseOver={e => (e.currentTarget.style.color = 'var(--forest)')}
                    onMouseOut={e => (e.currentTarget.style.color = 'var(--n-300)')}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 8 }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Please wait...' : btnLabels[mode]}
          </button>

          {(mode === 'login' || mode === 'register') && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--n-400)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setError(null)
                  setMode(mode === 'login' ? 'register' : 'login')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--forest)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--n-400)' }}>
              <button
                onClick={() => {
                  setError(null)
                  setMode('login')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--forest)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                ← Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
</file>

<file path="src/components/EmptyState.tsx">
import React from 'react'

interface Props {
  icon?:    string
  title:    string
  subtitle?: string
  action?:  React.ReactNode
}

const EmptyState: React.FC<Props> = ({ icon = '📭', title, subtitle, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '64px 32px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 48, marginBottom: 20 }}>{icon}</div>
    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8, fontWeight: 400 }}>
      {title}
    </h4>
    {subtitle && (
      <p style={{ color: 'var(--n-400)', fontSize: 14, maxWidth: 320, lineHeight: 1.6, marginBottom: 28 }}>
        {subtitle}
      </p>
    )}
    {action}
  </div>
)

export default EmptyState
</file>

<file path="src/components/Header.tsx">
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
</file>

<file path="src/components/LoadingSpinner.tsx">
import React from 'react'

interface Props {
  size?: number
  color?: string
  label?: string
}

const LoadingSpinner: React.FC<Props> = ({
  size  = 32,
  color = 'var(--forest)',
  label = 'Loading…',
}) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: '48px',
  }}>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
    <div style={{
      width: size, height: size,
      border: `3px solid ${color}22`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
    }} />
    {label && (
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        {label}
      </span>
    )}
  </div>
)

export default LoadingSpinner
</file>

<file path="src/components/SessionExtensionModal.tsx">
import React, { useState } from 'react'

interface Props {
  sessionId: string
  patientId: string
  cost10: number
  cost15: number
  walletBalance: number
  onClose: () => void
  onConfirmed: (minutes: number, newEndTime: string) => void
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7208/api/v1'

const SessionExtensionModal: React.FC<Props> = ({
  sessionId, patientId, cost10, cost15, walletBalance, onClose, onConfirmed
}) => {
  const [selected, setSelected]   = useState<10 | 15 | null>(null)
  const [loading, setLoading]     = useState(false)
  const [needsTopUp, setNeedsTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [upiId, setUpiId]         = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [waitingForClinician, setWaitingForClinician] = useState(false)

  const selectedCost = selected === 10 ? cost10 : selected === 15 ? cost15 : 0

  const handleRequestExtension = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    setWaitingForClinician(true)
    // The clinician accepts via SignalR → parent calls handleExtend
    setLoading(false)
  }

  const handleExtend = async (upiTopUp = 0, upiRef = '') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${BASE_URL}/Sessions/${sessionId}/extend`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('cognantic_token')}`,
          },
          body: JSON.stringify({
            patientId,
            extensionMinutes: selected,
            upiTopUpAmount: upiTopUp,
            upiGatewayRef: upiRef || null,
          }),
        }
      )
      const json = await res.json()

      if (json.value?.status === 'InsufficientFunds') {
        setNeedsTopUp(true)
        setTopUpAmount(String(Math.ceil(json.value.amountCharged - walletBalance)))
        return
      }

      onConfirmed(selected!, json.value.newScheduledEndTime)
      onClose()
    } catch {
      setError('Extension failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div style={{
        background: 'white', borderRadius: 24, padding: '40px 36px',
        maxWidth: 420, width: '100%', boxShadow: '0 40px 96px rgba(0,0,0,0.24)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏱</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8 }}>
            Session Ending Soon
          </h3>
          <p style={{ color: 'var(--n-400)', fontSize: 13 }}>
            Your session ends in <strong>5 minutes</strong>. Would you like to extend?
          </p>
        </div>

        {!waitingForClinician && !needsTopUp && (
          <>
            {/* Options */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
              {([10, 15] as const).map(mins => (
                <button
                  key={mins}
                  onClick={() => setSelected(mins)}
                  style={{
                    flex: 1, padding: '16px 12px', borderRadius: 16, cursor: 'pointer',
                    border: `2px solid ${selected === mins ? 'var(--forest)' : 'var(--n-200)'}`,
                    background: selected === mins ? 'rgba(57,120,106,0.06)' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--forest)' }}>
                    +{mins} min
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--n-400)', marginTop: 4 }}>
                    ₹{mins === 10 ? cost10 : cost15}
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <div style={{
                background: 'var(--n-50)', borderRadius: 12,
                padding: '12px 16px', fontSize: 13, marginBottom: 20,
              }}>
                Wallet balance: <strong>₹{walletBalance}</strong> •
                Cost: <strong>₹{selectedCost}</strong> •
                After: <strong>₹{Math.max(0, walletBalance - selectedCost)}</strong>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-full" onClick={onClose}>
                No, End Session
              </button>
              <button
                className="btn btn-forest btn-full"
                disabled={!selected || loading}
                onClick={handleRequestExtension}
              >
                {loading ? 'Requesting…' : 'Request Extension'}
              </button>
            </div>
          </>
        )}

        {/* Waiting for clinician */}
        {waitingForClinician && !needsTopUp && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <p style={{ color: 'var(--n-500)', fontSize: 14 }}>
              Waiting for clinician to accept the +{selected} min extension…
            </p>
            <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={onClose}>
              Cancel
            </button>
          </div>
        )}

        {/* Insufficient funds — UPI top-up */}
        {needsTopUp && (
          <>
            <div style={{
              background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13,
            }}>
              ⚠️ Insufficient wallet balance. Please top up <strong>₹{topUpAmount}</strong> via UPI
              to proceed with the extension.
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="label">UPI ID</label>
              <input className="input" placeholder="yourname@upi"
                value={upiId} onChange={e => setUpiId(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="label">Top-up Amount (₹)</label>
              <input className="input" type="number" value={topUpAmount}
                onChange={e => setTopUpAmount(e.target.value)} />
            </div>
            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline btn-full" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-forest btn-full"
                disabled={loading || !upiId}
                onClick={() => handleExtend(Number(topUpAmount), upiId)}
              >
                {loading ? 'Processing…' : 'Pay & Extend'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SessionExtensionModal
</file>

<file path="src/components/Toast.tsx">
import React, { useEffect } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Props {
  message:  string
  variant?: ToastVariant
  onClose:  () => void
  duration?: number
}

const COLORS: Record<ToastVariant, { bg: string; icon: string }> = {
  success: { bg: 'var(--forest)', icon: '✓' },
  error:   { bg: 'var(--danger)', icon: '✕' },
  warning: { bg: 'var(--warning)', icon: '⚠' },
  info:    { bg: 'var(--info)',    icon: 'ℹ' },
}

const Toast: React.FC<Props> = ({ message, variant = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const { bg, icon } = COLORS[variant]

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 3000,
      display: 'flex', alignItems: 'center', gap: 12,
      background: bg, color: 'white',
      padding: '14px 20px', borderRadius: 'var(--r-md)',
      boxShadow: '0 8px 24px rgba(28,28,30,0.2)',
      animation: 'fadeUp 0.3s ease',
      maxWidth: 360,
    }}>
      <span style={{ fontWeight: 800, fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer', marginLeft: 8, fontSize: 16, lineHeight: 1,
      }}>✕</button>
    </div>
  )
}

export default Toast
</file>

<file path="src/context/AuthContext.tsx">
// PATH: src/context/AuthContext.tsx
//
// Fixes applied:
//  1. Added forgotPassword(email) to AuthContextValue interface + provider.
//     AuthModal destructures it from useAuth() — without it, calling
//     forgotPassword() throws "TypeError: forgotPassword is not a function".
//
//  2. Added resetPassword(email, newPassword) for the same reason.
//
//  3. These two functions don't touch auth state (user/token) so they
//     simply delegate to authService directly — no isLoading spinner,
//     no error state update. AuthModal handles their own UI feedback.

import React, { createContext, useContext, useState, useCallback } from 'react'
import { authService } from '../services/authService'
import { clinicianService } from '../services/clinicianService'
import { patientService } from '../services/patientService'
import { setToken, clearToken } from '../api/apiClient'
import type { UserProfile } from '../services/authService'

// ── Shape ─────────────────────────────────────────────────────────
interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<any>
  register: (fullName: string, email: string, password: string, role: 'patient' | 'therapist') => Promise<any>
  logout: () => void
  // ✅ FIX: Added — AuthModal needs these; without them useAuth() returns undefined
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, newPassword: string) => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null)

// ── Helper: load persisted user from localStorage ─────────────────
function loadPersistedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('cognantic_user')
    if (!raw || raw === 'null' || raw === 'undefined') return null
    return JSON.parse(raw) as UserProfile
  } catch {
    localStorage.removeItem('cognantic_user')
    return null
  }
}

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]           = useState<UserProfile | null>(loadPersistedUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authService.login({ email, password })

      localStorage.setItem('cognantic_user', JSON.stringify(res.user))
      localStorage.setItem('userId', res.user.id)
      if (res.token) {
        localStorage.setItem('cognantic_token', res.token)
        setToken(res.token)
      }

      // ── Therapist: persist clinician profile IDs ───────────────
      if (res.user.role === 'therapist') {
        if ((res as any).clinicianId) {
          localStorage.setItem('clinicianId', String((res as any).clinicianId))
        }
        if ((res as any).vettingStatus) {
          localStorage.setItem('clinicianVettingStatus', (res as any).vettingStatus)
        }
        if ((res as any).rejectionReason) {
          localStorage.setItem('clinicianRejectionReason', (res as any).rejectionReason)
        } else {
          localStorage.removeItem('clinicianRejectionReason')
        }

        // Fallback: fetch profile if not returned inline by login response
        if (!localStorage.getItem('clinicianId')) {
          try {
            const profile = await clinicianService.getProfile(res.user.id)
            if (profile?.clinicianId) {
              localStorage.setItem('clinicianId', String(profile.clinicianId))
              localStorage.setItem('clinicianVettingStatus', profile.vettingStatus ?? 'Pending')
              if (profile.rejectionReason) {
                localStorage.setItem('clinicianRejectionReason', profile.rejectionReason)
              }
            }
          } catch {
            localStorage.removeItem('clinicianId')
          }
        }
      }

      // ── Patient: persist patient profile ID ───────────────────
      if (res.user.role === 'patient') {
        if ((res as any).patientId) {
          localStorage.setItem('patientId', String((res as any).patientId))
        }
        if (!localStorage.getItem('patientId')) {
          try {
            const profile = await patientService.getProfile(res.user.id)
            const pid = profile?.patientId ?? (profile as any)?.id
            if (pid) localStorage.setItem('patientId', String(pid))
          } catch {
            localStorage.removeItem('patientId')
          }
        }
      }

      // ✅ Single state update — Header, App, all subscribers re-render instantly
      setUser(res.user)
      setIsLoading(false)
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      setIsLoading(false)
      throw err
    }
  }, [])

  // ── Register ───────────────────────────────────────────────────
  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    role: 'patient' | 'therapist'
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authService.register({ fullName, email, password, role })
      localStorage.setItem('cognantic_user', JSON.stringify(res.user))
      localStorage.setItem('userId', res.user.id)
      if (res.token) {
        localStorage.setItem('cognantic_token', res.token)
        setToken(res.token)
      }
      // Clear any stale profile IDs from a previous session
      localStorage.removeItem('clinicianId')
      localStorage.removeItem('patientId')
      localStorage.removeItem('clinicianVettingStatus')
      localStorage.removeItem('clinicianRejectionReason')

      // ✅ Set user immediately — callers can then call onSuccess() directly
      setUser(res.user)
      setIsLoading(false)
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      setIsLoading(false)
      throw err
    }
  }, [])

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(() => {
    authService.logout()
    clearToken()
    localStorage.removeItem('cognantic_user')
    localStorage.removeItem('userId')
    localStorage.removeItem('cognantic_token')
    localStorage.removeItem('clinicianId')
    localStorage.removeItem('patientId')
    localStorage.removeItem('clinicianVettingStatus')
    localStorage.removeItem('clinicianRejectionReason')
    localStorage.removeItem('cognantic_current_view')
    setUser(null)
  }, [])

  // ── Forgot Password ────────────────────────────────────────────
  // ✅ FIX: Added — AuthModal calls this; without it useAuth() returns undefined
  // Does not touch auth state (user/token), so no isLoading/error update.
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    await authService.forgotPassword(email)
  }, [])

  // ── Reset Password ─────────────────────────────────────────────
  // ✅ FIX: Added — same reason as forgotPassword above.
  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<void> => {
    await authService.resetPassword(email, newPassword)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, isLoading, error,
      login, register, logout,
      forgotPassword, resetPassword,   // ✅ exposed to all consumers
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Consumer hook ──────────────────────────────────────────────────
export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}
</file>

<file path="src/hooks/index.ts">
export { useAuth } from './useAuth'
export { useApi  } from './useApi'
</file>

<file path="src/hooks/useApi.ts">
// ─────────────────────────────────────────────────────────────────
// Cognantic – useApi generic data-fetching hook
// ─────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseApiState<T> {
  data:      T | null
  isLoading: boolean
  error:     string | null
}

export function useApi<T>(
  fetcher: () => Promise<{ data: T }>,
  deps: unknown[] = [],
) {
  const [state, setState] = useState<UseApiState<T>>({
    data:      null,
    isLoading: true,
    error:     null,
  })

  const mounted = useRef(true)

  const execute = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, error: null }))
    try {
      const res = await fetcher()
      if (mounted.current) setState({ data: res.data, isLoading: false, error: null })
    } catch (err) {
      if (mounted.current) {
        const msg = err instanceof Error ? err.message : 'Request failed'
        setState({ data: null, isLoading: false, error: msg })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mounted.current = true
    execute()
    return () => { mounted.current = false }
  }, [execute])

  return { ...state, refetch: execute }
}
</file>

<file path="src/hooks/useAuth.ts">
export { useAuthContext as useAuth } from '../context/AuthContext'
</file>

<file path="src/hooks/useSessionHub.ts">
import { useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'

export interface EndingWarning {
  sessionId: string
  minutesRemaining: number
  cost10: number
  cost15: number
}

export interface ExtensionConfirmed {
  extensionMinutes: number
  newEndTime: string
  amountCharged: number
}

export function useSessionHub(
  sessionId: string | null,
  role: 'patient' | 'clinician',
  onWarning: (w: EndingWarning) => void,
  onExtensionOffer: (offer: { extensionId: string; minutes: number; cost: number }) => void,
  onExtensionResponse: (res: { accepted: boolean; extensionId: string }) => void,
  onExtensionConfirmed: (c: ExtensionConfirmed) => void,
) {
  const connRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    if (!sessionId) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7208'}/hubs/session`, {
        accessTokenFactory: () => localStorage.getItem('cognantic_token') ?? '',
      })
      .withAutomaticReconnect()
      .build()

    conn.on('SessionEndingWarning', onWarning)
    conn.on('ExtensionOffer',       onExtensionOffer)
    conn.on('ExtensionResponse',    onExtensionResponse)
    conn.on('ExtensionConfirmed',   onExtensionConfirmed)

    conn.start()
      .then(() => conn.invoke('JoinSession', sessionId, role))
      .catch(console.error)

    connRef.current = conn

    return () => { conn.stop() }
  }, [sessionId])

  const respondToExtension = useCallback(
    (accepted: boolean, extensionId: string) => {
      connRef.current?.invoke('RespondToExtension',
        sessionId, accepted, extensionId)
    }, [sessionId])

  return { respondToExtension }
}
</file>

<file path="src/main.tsx">
// ─────────────────────────────────────────────────────────────────
// src/main.tsx  ── UPDATED
//
// Wraps <App> with <AuthProvider> so all components share one
// auth state instance (fixes the Header not updating on login).
// ─────────────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
</file>

<file path="src/pages/AdminPage.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/AdminPage.tsx  ── UPDATED
//
// Fixes:
//  1. WithdrawalsTab.fetchWithdrawals() now calls adminService.getWithdrawalRequests()
//     instead of just setIsLoading(false) — this is why payouts were invisible.
//  2. handleApprove now uses adminService.approveWithdrawal() (consistent with auth).
//  3. ManualOnboardTab now shows the temp password returned by the backend
//     so the Admin can send it to the clinician (previously discarded).
//  4. Added toast notifications in place of alert() calls.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import {
  adminService,
  type AdminStats,
  type VettingApplicant,
  type WithdrawalRequestItem,
} from '../services/adminService'
import LoadingSpinner from '../components/LoadingSpinner'

type Tab = 'overview' | 'vetting' | 'onboard' | 'withdrawals' | 'logs'

// ── Simple toast ───────────────────────────────────────────────────
function Toast({ msg, variant = 'success' }: { msg: string; variant?: 'success' | 'danger' }) {
  return (
    <div style={{
      position: 'fixed', top: 24, right: 28, zIndex: 9999,
      background: variant === 'success' ? 'var(--charcoal)' : 'var(--danger)',
      color: 'white', padding: '12px 24px', borderRadius: 12,
      fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      animation: 'fadeIn 0.25s ease',
    }}>
      {msg}
    </div>
  )
}

// ── Overview Tab ────────────────────────────────────────────────────
const OverviewTab: React.FC = () => {
  const [stats, setStats]         = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    adminService.getStats()
      .then(data => { setStats(data); setIsLoading(false) })
      .catch(err => { setError(err instanceof Error ? err.message : 'Failed to load stats'); setIsLoading(false) })
  }, [])

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>
  if (error)     return <div style={{ padding: 24, color: 'var(--danger)', fontSize: 13 }}>{error}</div>

  const kpis = [
    { label: 'Total Patients',     value: stats?.totalPatients ?? 0,     accent: 'forest'  },
    { label: 'Total Clinicians',   value: stats?.totalClinicians ?? 0,   accent: 'sage'    },
    { label: 'Scheduled Sessions', value: stats?.scheduledSessions ?? 0, accent: 'warning' },
    { label: 'Avg Resilience',     value: `${(stats?.averageResilienceScore ?? 0).toFixed(0)}%`, dark: true },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 36 }}>
        {kpis.map(k => (
          <div key={k.label} className="card" style={{
            padding: '28px 24px',
            background: k.dark ? 'var(--charcoal)' : 'white',
            borderLeft: k.dark ? 'none' : `4px solid var(--${k.accent})`,
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: k.dark ? 'rgba(255,255,255,0.3)' : 'var(--n-400)', marginBottom: 12 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: k.dark ? 'white' : 'var(--charcoal)', lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {stats?.recentActivities && stats.recentActivities.length > 0 && (
        <div className="card" style={{ padding: '28px 32px' }}>
          <h4 style={{ fontWeight: 800, fontSize: 16, marginBottom: 20 }}>Recent Activity</h4>
          {stats.recentActivities.map((a, i) => (
            <div key={i} className="log-line">
              <span className="log-time">{new Date(a.timestamp).toLocaleString()}</span>
              <span className="log-type" style={{ color: a.type === 'Booking' ? 'var(--forest)' : 'var(--warning)' }}>
                {a.type.toUpperCase()}
              </span>
              <span>{a.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vetting Tab ─────────────────────────────────────────────────────
const VettingTab: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Verified' | 'Rejected'>('Pending')
  const [applicants, setApplicants]     = useState<VettingApplicant[]>([])
  const [isLoading, setIsLoading]       = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectFor, setShowRejectFor] = useState<string | null>(null)
  const [toast, setToast]               = useState<{ msg: string; variant: 'success' | 'danger' } | null>(null)

  const showToast = (msg: string, variant: 'success' | 'danger' = 'success') => {
    setToast({ msg, variant })
    setTimeout(() => setToast(null), 3000)
  }

  const load = (status: string) => {
    setIsLoading(true); setError(null)
    adminService.getVettingList(status)
      .then(data => { setApplicants(data); setIsLoading(false) })
      .catch(err  => { setError(err instanceof Error ? err.message : 'Failed'); setIsLoading(false) })
  }

  useEffect(() => { load(statusFilter) }, [statusFilter])

  const handleAction = async (clinicianId: string, action: 'Approve' | 'Reject', reason?: string) => {
    setProcessingId(clinicianId)
    try {
      await adminService.processVettingAction({ clinicianId, action, reason })
      showToast(action === 'Approve' ? 'Clinician approved ✓' : 'Clinician rejected ✗', action === 'Approve' ? 'success' : 'danger')
      setShowRejectFor(null); setRejectReason('')
      load(statusFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} variant={toast.variant} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22 }}>Clinician Vetting Queue</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Pending', 'Verified', 'Rejected'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${statusFilter === f ? 'var(--forest)' : 'var(--n-200)'}`,
              background: statusFilter === f ? 'rgba(52,122,86,0.08)' : 'white',
              color: statusFilter === f ? 'var(--forest)' : 'var(--n-400)',
            }}>{f === 'Verified' ? 'Approved' : f}</button>
          ))}
        </div>
      </div>

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>}
      {error && <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
      {!isLoading && !error && applicants.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <p style={{ fontSize: 14 }}>No clinicians with status "{statusFilter}".</p>
        </div>
      )}

      {!isLoading && !error && applicants.length > 0 && (
        <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
          <table className="data-table">
            <thead>
              <tr><th>Clinician</th><th>Specialty</th><th>Credential</th><th>Applied</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {applicants.map(a => (
                <React.Fragment key={a.clinicianId}>
                  <tr>
                    <td>
                      <div style={{ fontWeight: 700 }}>{a.fullName}</div>
                      <div style={{ fontSize: 11, color: 'var(--n-400)' }}>{a.email}</div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--n-500)' }}>{a.specialty || '—'}</td>
                    <td style={{ fontSize: 13, color: 'var(--n-500)' }}>{a.credential || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--n-400)' }}>{new Date(a.createdTime).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${a.vettingStatus === 'Verified' ? 'badge-live' : a.vettingStatus === 'Rejected' ? 'badge-red' : 'badge-amber'}`}>
                        {a.vettingStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {a.vettingStatus === 'Pending' && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button className="btn btn-forest btn-sm" disabled={processingId === a.clinicianId} onClick={() => handleAction(a.clinicianId, 'Approve')}>
                            {processingId === a.clinicianId ? '…' : 'Approve'}
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => setShowRejectFor(showRejectFor === a.clinicianId ? null : a.clinicianId)}>Reject</button>
                        </div>
                      )}
                      {a.vettingStatus === 'Verified' && (
                        <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} disabled={processingId === a.clinicianId}
                          onClick={() => setShowRejectFor(showRejectFor === a.clinicianId ? null : a.clinicianId)}>Revoke</button>
                      )}
                      {a.vettingStatus === 'Rejected' && (
                        <button className="btn btn-forest btn-sm" disabled={processingId === a.clinicianId} onClick={() => handleAction(a.clinicianId, 'Approve')}>
                          {processingId === a.clinicianId ? '…' : 'Re-Approve'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {showRejectFor === a.clinicianId && (
                    <tr>
                      <td colSpan={6} style={{ background: 'rgba(239,68,68,0.04)', padding: '16px 28px' }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <input className="input" style={{ flex: 1, padding: '10px 16px' }}
                            placeholder="Reason for rejection (required — clinician will see this)…"
                            value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                          <button className="btn btn-danger btn-sm" disabled={!rejectReason.trim() || processingId === a.clinicianId}
                            onClick={() => handleAction(a.clinicianId, 'Reject', rejectReason)}>Confirm</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setShowRejectFor(null); setRejectReason('') }}>Cancel</button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 8 }}>
                          ⚠️ This reason will be shown to the clinician when they log in.
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Manual Onboard Tab ─────────────────────────────────────────────
const SPECIALTIES = [
  'CBT', 'Psychotherapy', 'Grief Counselling', 'Trauma & PTSD',
  'Anxiety & Depression', 'Family Therapy', 'Addiction Recovery',
  'Child & Adolescent', 'Couples Therapy', 'Mindfulness-Based',
]

interface OnboardForm {
  fullName: string; email: string; specialty: string
  languages: string; credential: string; bio: string; hourlyRate: string
}

const ManualOnboardTab: React.FC = () => {
  const [form, setForm] = useState<OnboardForm>({ fullName: '', email: '', specialty: '', languages: '', credential: '', bio: '', hourlyRate: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<{ name: string; tempPassword: string } | null>(null)

  const set = (field: keyof OnboardForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))

  const canSubmit = form.fullName.trim() && form.email.trim() && form.specialty && form.credential.trim() && Number(form.hourlyRate) > 0

  const handleSubmit = async () => {
    setIsSubmitting(true); setError(null); setResult(null)
    try {
      const res = await adminService.manualOnboard({
        fullName: form.fullName.trim(), email: form.email.trim(),
        specialty: form.specialty, languages: form.languages.trim(),
        credential: form.credential.trim(), bio: form.bio.trim(),
        hourlyRate: Number(form.hourlyRate),
      })
      setResult({ name: form.fullName, tempPassword: res.tempPassword ?? '(check server logs)' })
      setForm({ fullName: '', email: '', specialty: '', languages: '', credential: '', bio: '', hourlyRate: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Manual onboarding failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Manually Onboard a Clinician</h2>
          <p style={{ fontSize: 13, color: 'var(--n-400)' }}>
            Skips user registration. The clinician is saved as{' '}
            <strong style={{ color: 'var(--forest)' }}>Verified</strong> and immediately searchable.
          </p>
        </div>
        <span style={{ background: 'rgba(52,122,86,0.1)', color: 'var(--forest)', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', padding: '5px 12px', borderRadius: 100, whiteSpace: 'nowrap' }}>
          ADMIN ONLY
        </span>
      </div>

      {/* ✅ NEW: Show temp password after onboard so admin can share it */}
      {result && (
        <div style={{ background: 'rgba(52,122,86,0.08)', border: '1px solid rgba(52,122,86,0.3)', borderRadius: 12, padding: '18px 22px', marginBottom: 24 }}>
          <p style={{ fontWeight: 700, color: 'var(--forest)', marginBottom: 10 }}>✓ {result.name} onboarded successfully.</p>
          <p style={{ fontSize: 13, color: 'var(--n-500)', marginBottom: 8 }}>Share these login credentials with the clinician:</p>
          <div style={{ background: 'white', border: '1px solid var(--n-200)', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>
            <div><strong>Temp Password:</strong> {result.tempPassword}</div>
            <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 6 }}>⚠️ Clinician should change this after first login.</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', color: 'var(--danger)', fontSize: 13, marginBottom: 24 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ padding: '32px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div><label className="label">FULL NAME *</label><input className="input" placeholder="Dr. Rishad Kalathil" value={form.fullName} onChange={set('fullName')} /></div>
          <div><label className="label">EMAIL *</label><input className="input" type="email" placeholder="doctor@hospital.in" value={form.email} onChange={set('email')} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div>
            <label className="label">SPECIALTY *</label>
            <select className="input" value={form.specialty} onChange={set('specialty')} style={{ cursor: 'pointer' }}>
              <option value="">Select…</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">HOURLY RATE (INR) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: 'var(--n-400)', fontSize: 15 }}>₹</span>
              <input className="input" style={{ paddingLeft: 36 }} type="number" min="1" placeholder="1000" value={form.hourlyRate} onChange={set('hourlyRate')} />
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div><label className="label">CREDENTIALS *</label><input className="input" placeholder="M.Phil (Clinical Psych), RCI" value={form.credential} onChange={set('credential')} /></div>
          <div><label className="label">LANGUAGES (comma-separated)</label><input className="input" placeholder="English, Malayalam, Hindi" value={form.languages} onChange={set('languages')} /></div>
        </div>
        <div style={{ marginBottom: 28 }}>
          <label className="label">BIO (optional)</label>
          <textarea className="input" rows={4} placeholder="Brief professional background…" value={form.bio} onChange={set('bio')} style={{ resize: 'vertical', lineHeight: 1.6 }} />
        </div>
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 12, color: 'var(--n-500)', marginBottom: 24, display: 'flex', gap: 8 }}>
          <span>⚠️</span>
          <span>A temporary password will be generated. Share it with the clinician via a secure channel.</span>
        </div>
        <button className="btn btn-forest" style={{ width: '100%', padding: '14px 0', fontSize: 14 }} disabled={!canSubmit || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? 'Saving…' : '✓ ONBOARD AS VERIFIED CLINICIAN'}
        </button>
      </div>
    </div>
  )
}

// ── Withdrawals Tab  ────────────────────────────────────────────────
// FIX: was calling setIsLoading(false) without ever fetching data.
// Now calls adminService.getWithdrawalRequests() properly.
const WithdrawalsTab: React.FC = () => {
  const [requests, setRequests]   = useState<WithdrawalRequestItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [toast, setToast]         = useState<{ msg: string; variant: 'success' | 'danger' } | null>(null)
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending')

  const showToast = (msg: string, variant: 'success' | 'danger' = 'success') => {
    setToast({ msg, variant })
    setTimeout(() => setToast(null), 3000)
  }

  // ✅ FIX: actually call the API
  const fetchWithdrawals = async (status = statusFilter) => {
    setIsLoading(true); setError(null)
    try {
      const data = await adminService.getWithdrawalRequests(status)
      setRequests(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load withdrawal requests')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchWithdrawals(statusFilter) }, [statusFilter])

  const handleApprove = async (withdrawalId: string, approved: boolean) => {
    setProcessingId(withdrawalId)
    try {
      await adminService.approveWithdrawal({
        withdrawalId,
        approved,
        adminNotes: approved ? 'Approved by admin' : 'Rejected by admin',
      })
      showToast(approved ? '✓ Withdrawal approved & transferred' : '✗ Withdrawal rejected', approved ? 'success' : 'danger')
      fetchWithdrawals(statusFilter)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'danger')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="animate-fade-up">
      {toast && <Toast msg={toast.msg} variant={toast.variant} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--charcoal)' }}>
            Payout Requests
          </h2>
          <p style={{ color: 'var(--n-400)', fontSize: 13, marginTop: 4 }}>
            Review and process clinician withdrawal requests.
          </p>
        </div>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['Pending', 'Approved', 'Rejected'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1.5px solid ${statusFilter === s ? 'var(--forest)' : 'var(--n-200)'}`,
              background: statusFilter === s ? 'rgba(52,122,86,0.08)' : 'white',
              color: statusFilter === s ? 'var(--forest)' : 'var(--n-400)',
            }}>{s}</button>
          ))}
        </div>
      </div>

      {isLoading && <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><LoadingSpinner /></div>}
      {error && <div style={{ padding: 16, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}

      {!isLoading && !error && requests.length === 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--n-400)', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>💰</div>
            <p>No {statusFilter.toLowerCase()} payout requests found.</p>
          </div>
        </div>
      )}

      {!isLoading && !error && requests.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--n-50)', borderBottom: '1px solid var(--n-100)', textAlign: 'left' }}>
                <th style={{ padding: '16px 24px', fontWeight: 700 }}>Clinician</th>
                <th style={{ padding: '16px 24px', fontWeight: 700 }}>Amount</th>
                <th style={{ padding: '16px 24px', fontWeight: 700 }}>Method & Details</th>
                <th style={{ padding: '16px 24px', fontWeight: 700 }}>Status</th>
                {statusFilter === 'Pending' && <th style={{ padding: '16px 24px', fontWeight: 700, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.withdrawalId} style={{ borderBottom: '1px solid var(--n-50)' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 700 }}>{r.clinicianName}</div>
                    <div style={{ fontSize: 11, color: 'var(--n-400)' }}>Requested {new Date(r.createdTime).toLocaleDateString()}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--forest)', fontSize: 15 }}>₹{r.amount.toLocaleString()}</span>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: 600 }}>{r.payoutMethod}</div>
                    <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 2 }}>{r.payoutDetails}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span className={`badge ${r.status === 'Approved' || r.status === 'Transferred' ? 'badge-live' : r.status === 'Rejected' ? 'badge-red' : 'badge-amber'}`}>
                      {r.status}
                    </span>
                  </td>
                  {statusFilter === 'Pending' && (
                    <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          disabled={processingId === r.withdrawalId}
                          onClick={() => handleApprove(r.withdrawalId, false)}
                        >
                          Reject
                        </button>
                        <button
                          className="btn btn-forest btn-sm"
                          disabled={processingId === r.withdrawalId}
                          onClick={() => handleApprove(r.withdrawalId, true)}
                        >
                          {processingId === r.withdrawalId ? '…' : 'Approve & Transfer'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Logs Tab ────────────────────────────────────────────────────────
const LogsTab: React.FC = () => {
  const MOCK_LOGS = [
    { ts: new Date().toISOString(),                  type: 'AUTH', msg: 'Patient login: user@example.com' },
    { ts: new Date(Date.now()-120000).toISOString(), type: 'VET',  msg: 'Clinician approved: Dr. Rishad' },
    { ts: new Date(Date.now()-300000).toISOString(), type: 'SYS',  msg: 'Database backup completed' },
    { ts: new Date(Date.now()-600000).toISOString(), type: 'PAY',  msg: 'Session payment processed: ₹2,400' },
  ]
  const typeColor: Record<string, string> = { AUTH: 'var(--forest)', VET: 'var(--warning)', SYS: 'var(--n-400)', PAY: 'var(--success)' }

  return (
    <div>
      <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 28 }}>System Audit Log</h2>
      <div className="card" style={{ padding: '16px 32px' }}>
        {MOCK_LOGS.map((l, i) => (
          <div key={i} className="log-line">
            <span className="log-time">{new Date(l.ts).toLocaleString()}</span>
            <span className="log-type" style={{ color: typeColor[l.type] ?? 'var(--n-400)' }}>{l.type}</span>
            <span>{l.msg}</span>
          </div>
        ))}
        <p style={{ fontSize: 11, color: 'var(--n-300)', padding: '16px 0', textAlign: 'center' }}>
          Connect <code style={{ background: 'var(--n-100)', padding: '2px 6px', borderRadius: 4, fontSize: 10 }}>GET /api/v1/Admin/audit</code> for live logs.
        </p>
      </div>
    </div>
  )
}

// ── Root ────────────────────────────────────────────────────────────
const AdminPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview',     label: 'Overview'   },
    { key: 'vetting',      label: 'Vetting'    },
    { key: 'onboard',      label: '+ Onboard'  },
    { key: 'withdrawals',  label: '💰 Payouts' },
    { key: 'logs',         label: 'Logs'       },
  ]

  return (
    <div className="page animate-fade-up">
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--charcoal)', marginBottom: 8 }}>
          Admin Console
        </h2>
        <p style={{ color: 'var(--n-400)', fontSize: 14 }}>
          Platform analytics, clinician vetting, and system health.
        </p>
      </div>

      <div className="tab-nav">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
            style={t.key === 'onboard' ? { color: 'var(--forest)', fontWeight: 700 } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview'    && <OverviewTab />}
      {tab === 'vetting'     && <VettingTab />}
      {tab === 'onboard'     && <ManualOnboardTab />}
      {tab === 'withdrawals' && <WithdrawalsTab />}
      {tab === 'logs'        && <LogsTab />}
    </div>
  )
}

export default AdminPage
</file>

<file path="src/pages/ClinicianOnboardingForm.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/ClinicianOnboardingForm.tsx  ── FIXED
//
// Bug fixes applied:
//  1. After successful POST /api/v1/Clinicians the response
//     { clinicianId } is now persisted to localStorage('clinicianId').
//     This is the key that App.tsx checks to skip onboarding on
//     re-login. Without this, the user would be stuck on the form
//     every time they refreshed or re-logged in.
//
//  2. FullName is pre-populated from cognantic_user.name so the
//     clinician doesn't have to retype what they already entered at
//     registration.
//
//  3. After submission, setView('therapist') navigates to the
//     dashboard (which shows a "pending" banner). Previously it
//     was calling setView incorrectly.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import type { ViewType } from '../App'
import { clinicianService } from '../services/clinicianService'

interface Props {
  setView: (v: ViewType) => void
}

interface FormState {
  fullName:   string
  specialty:  string
  languages:  string[]
  hourlyRate: string
  credential: string
  bio:        string
}

const SPECIALTIES = [
  'CBT',
  'Psychotherapy',
  'Grief Counselling',
  'Trauma & PTSD',
  'Anxiety & Depression',
  'Family Therapy',
  'Addiction Recovery',
  'Child & Adolescent',
  'Couples Therapy',
  'Mindfulness-Based',
]

const LANGUAGES = [
  'English', 'Malayalam', 'Hindi', 'Tamil', 'Telugu',
  'Kannada', 'Bengali',  'Marathi', 'Urdu', 'Gujarati',
]

const STEPS = ['Profile', 'Credentials', 'Review']

// ── Read persisted login info ─────────────────────────────────────
function getPersistedUser() {
  try {
    const raw = localStorage.getItem('cognantic_user')
    if (!raw) return { name: '', email: '' }
    const u = JSON.parse(raw)
    return { name: u?.name ?? '', email: u?.email ?? '' }
  } catch {
    return { name: '', email: '' }
  }
}

const ClinicianOnboardingForm: React.FC<Props> = ({ setView }) => {
  const { name: persistedName, email } = getPersistedUser()
  const userId = localStorage.getItem('userId') ?? ''

  const [step, setStep]           = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  // FIX 2: Pre-fill fullName from login so clinician doesn't retype
  const [form, setForm] = useState<FormState>({
    fullName:   persistedName,
    specialty:  '',
    languages:  [],
    hourlyRate: '',
    credential: '',
    bio:        '',
  })

  useEffect(() => {
    async function loadExistingProfile() {
      const existingClinicianId = localStorage.getItem('clinicianId')
      if (!existingClinicianId || !userId) return

      try {
        const profile = await clinicianService.getProfile(userId)
        if (!profile) return

        setForm({
          fullName:   profile.fullName || persistedName,
          specialty:  profile.specialty || '',
          languages:  profile.languages ? profile.languages.split(',').map((s: string) => s.trim()) : [],
          hourlyRate: profile.hourlyRate != null ? String(profile.hourlyRate) : '',
          credential: profile.credential || '',
          bio:        profile.bio || '',
        })
      } catch (err) {
        console.error('Failed to pre-fill profile', err)
      }
    }

    loadExistingProfile()
  }, [userId, persistedName])

  const toggleLanguage = (lang: string) =>
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }))

  const canProceedStep0 =
    form.fullName.trim().length > 0 &&
    form.specialty.length > 0 &&
    form.languages.length > 0

  const canProceedStep1 =
    form.hourlyRate.trim().length > 0 &&
    Number(form.hourlyRate) > 0 &&
    form.credential.trim().length > 0

  const handleSubmit = async () => {
    if (!userId) {
      setError('Session expired. Please log in again.')
      return
    }
    setIsSubmitting(true)
    setError(null)

    try {
      // POST /api/v1/Clinicians
      // Clinician_PostResponse = { clinicianId: Guid, vettingStatus: string, createdTime: DateTime }
      const response = await clinicianService.createProfile({
        userId,
        fullName:   form.fullName.trim(),
        email,
        specialty:  form.specialty,
        languages:  form.languages.join(', '),
        credential: form.credential.trim(),
        bio:        form.bio.trim(),
        hourlyRate: Number(form.hourlyRate),
      }) as any

      // ── FIX 1: Persist clinicianId ───────────────────────────
      // The Clinician_PostHandler sets ClinicianId = user.Id (shared PK).
      // We store it so App.tsx's handleAuthSuccess / resolveInitialView
      // can detect an existing profile on every subsequent login/reload.
      //
      // apiClient already unwraps BackendResult<T>.data, so `response`
      // IS the Clinician_PostResponse directly.
      const clinicianId =
        response?.clinicianId ??    // camelCase (JSON default)
        response?.ClinicianId ??    // PascalCase fallback
        userId                      // last resort: shared PK guarantee

      localStorage.setItem('clinicianId', String(clinicianId))
      localStorage.setItem('cognantic_current_view', 'therapist')

      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Success Screen ─────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        className="page animate-fade-up"
        style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: 80 }}
      >
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'var(--forest)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
        }}>
          <span style={{ fontSize: 36, color: 'white' }}>✓</span>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 36,
          color: 'var(--charcoal)', marginBottom: 16,
        }}>
          Application Received
        </h2>

        <p style={{ color: 'var(--n-400)', fontSize: 15, lineHeight: 1.7, marginBottom: 12 }}>
          Welcome, <strong>{form.fullName}</strong>. Your profile is{' '}
          <strong style={{ color: 'var(--warning)' }}>pending admin review</strong>.
        </p>
        <p style={{ color: 'var(--n-400)', fontSize: 14, lineHeight: 1.7, marginBottom: 36 }}>
          You'll be visible to patients once an admin approves your application
          (usually within 1–2 business days).
        </p>

        {/* FIX 3: navigate correctly to therapist view */}
        <button
          className="btn btn-forest"
          onClick={() => {
            setView('therapist')
          }}
        >
          View My Dashboard →
        </button>
      </div>
    )
  }

  const progressPct = ((step + 1) / STEPS.length) * 100

  return (
    <div className="page animate-fade-up" style={{ maxWidth: 640, margin: '0 auto' }}>

      {/* ── Progress Bar ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 12,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'var(--n-400)',
          }}>
            STEP {step + 1} OF {STEPS.length} · {STEPS[step].toUpperCase()}
          </span>
          <span style={{ fontSize: 12, color: 'var(--n-400)' }}>🔒 ENCRYPTED</span>
        </div>
        <div style={{ height: 4, background: 'var(--n-200)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progressPct}%`,
            background: 'var(--forest)', borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* ── Back Button ──────────────────────────────────────────── */}
      {step > 0 && (
        <button
          onClick={() => { setStep(s => s - 1); setError(null) }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            color: 'var(--n-400)', fontSize: 13, marginBottom: 28, padding: 0,
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            border: '1.5px solid var(--n-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>←</span>
          Back
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 0 — Profile
      ══════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 38,
            color: 'var(--charcoal)', marginBottom: 8,
          }}>
            Set up your profile
          </h2>
          <p style={{ color: 'var(--n-400)', fontSize: 14, marginBottom: 40 }}>
            Help patients find the right match.
          </p>

          <div style={{ marginBottom: 28 }}>
            <label className="label">FULL NAME (AS ON LICENSE)</label>
            <input
              className="input"
              placeholder="Dr. Priya Nair"
              value={form.fullName}
              onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
            />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label className="label">SPECIALTY</label>
            <select
              className="input"
              value={form.specialty}
              onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))}
              style={{ cursor: 'pointer' }}
            >
              <option value="">Select your primary specialty…</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 40 }}>
            <label className="label" style={{ display: 'block', marginBottom: 12 }}>
              LANGUAGES (SELECT ALL THAT APPLY)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {LANGUAGES.map(lang => {
                const selected = form.languages.includes(lang)
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    style={{
                      padding: '9px 18px', borderRadius: 100, fontSize: 13,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      border: `1.5px solid ${selected ? 'var(--forest)' : 'var(--n-200)'}`,
                      background: selected ? 'rgba(52,122,86,0.08)' : 'white',
                      color: selected ? 'var(--forest)' : 'var(--charcoal)',
                      fontWeight: selected ? 700 : 500,
                    }}
                  >
                    {lang}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            className="btn btn-forest"
            style={{ width: '100%', padding: '16px 0', fontSize: 15 }}
            disabled={!canProceedStep0}
            onClick={() => setStep(1)}
          >
            CONTINUE →
          </button>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 1 — Credentials & Rate
      ══════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 38,
            color: 'var(--charcoal)', marginBottom: 8,
          }}>
            Credentials & Rate
          </h2>
          <p style={{ color: 'var(--n-400)', fontSize: 14, marginBottom: 40 }}>
            This goes to admin review before you become visible on the platform.
          </p>

          <div style={{ marginBottom: 28 }}>
            <label className="label">DEGREES / CERTIFICATIONS</label>
            <input
              className="input"
              placeholder="e.g. M.Phil (Clinical Psychology), RCI Licensed"
              value={form.credential}
              onChange={e => setForm(p => ({ ...p, credential: e.target.value }))}
            />
            <p style={{ fontSize: 11, color: 'var(--n-300)', marginTop: 6 }}>
              List your highest qualifications. Commas are fine.
            </p>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label className="label">HOURLY RATE (INR)</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 18, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--n-400)', fontSize: 16, fontWeight: 600,
              }}>₹</span>
              <input
                className="input"
                style={{ paddingLeft: 38 }}
                type="number"
                min="1"
                placeholder="75"
                value={form.hourlyRate}
                onChange={e => setForm(p => ({ ...p, hourlyRate: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 40 }}>
            <label className="label">
              BIO{' '}
              <span style={{
                color: 'var(--n-300)', fontWeight: 500,
                textTransform: 'none', letterSpacing: 0,
              }}>
                (Optional — shown to patients)
              </span>
            </label>
            <textarea
              className="input"
              rows={5}
              placeholder="I have 8 years of experience helping individuals navigate anxiety, grief, and major life transitions…"
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              style={{ resize: 'vertical', lineHeight: 1.6 }}
              maxLength={500}
            />
            <p style={{ fontSize: 11, color: 'var(--n-300)', marginTop: 6, textAlign: 'right' }}>
              {form.bio.length}/500
            </p>
          </div>

          <button
            className="btn btn-forest"
            style={{ width: '100%', padding: '16px 0', fontSize: 15 }}
            disabled={!canProceedStep1}
            onClick={() => setStep(2)}
          >
            REVIEW APPLICATION →
          </button>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 2 — Review & Submit
      ══════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 38,
            color: 'var(--charcoal)', marginBottom: 8,
          }}>
            Review your application
          </h2>
          <p style={{ color: 'var(--n-400)', fontSize: 14, marginBottom: 40 }}>
            Confirm your details before sending to the admin team for vetting.
          </p>

          <div className="card" style={{ padding: '28px 32px', marginBottom: 28 }}>
            {[
              { label: 'Full Name',   value: form.fullName },
              { label: 'Email',       value: email },
              { label: 'Specialty',   value: form.specialty },
              { label: 'Languages',   value: form.languages.join(', ') || '—' },
              { label: 'Credentials', value: form.credential },
              { label: 'Hourly Rate', value: `₹${form.hourlyRate}/hr` },
              { label: 'Bio',         value: form.bio || '—' },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{
                  display: 'grid', gridTemplateColumns: '140px 1fr',
                  gap: 12, padding: '12px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--n-100)' : 'none',
                }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--n-400)', paddingTop: 2,
                }}>
                  {row.label}
                </span>
                <span style={{ fontSize: 14, color: 'var(--charcoal)', lineHeight: 1.5 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Status notice */}
          <div style={{
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 28,
            fontSize: 13, color: 'var(--charcoal)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <div>
              <strong>Pending Admin Review</strong>
              <p style={{ margin: '4px 0 0', color: 'var(--n-400)', fontSize: 12 }}>
                Your profile will be reviewed within 1–2 business days. You'll receive a
                notification once approved.
              </p>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 12, padding: '14px 18px',
              color: 'var(--danger)', fontSize: 13, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-forest"
            style={{ width: '100%', padding: '16px 0', fontSize: 15 }}
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Submitting…' : 'SUBMIT APPLICATION →'}
          </button>
        </>
      )}
    </div>
  )
}

export default ClinicianOnboardingForm
</file>

<file path="src/pages/HomePage.tsx">
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
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 80, alignItems: 'center', marginBottom: 100,
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
          fontSize: 'clamp(52px, 6.5vw, 84px)',
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 64 }}>
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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20, marginBottom: 64 }}>
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
</file>

<file path="src/pages/patient/components/DashboardView.tsx">
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
</file>

<file path="src/pages/patient/components/FinderFlow.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/patient/components/FinderFlow.tsx  ── UPDATED
//
// Fixes (Point 1 — In-Flow Wallet Top-Up):
//  • Replaced alert() for insufficient wallet funds with an inline
//    top-up modal (InFlowTopUpModal). The patient enters a UPI ID,
//    the topUp API is called, and on success the booking is confirmed
//    automatically — no leaving the page, no lost state.
//  • Added isConfirming state on the Confirm & Pay button to prevent
//    double-click double-debits (Point 9 suggestion).
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import { clinicianService, type MatchResult, type AvailableSlot } from '../../../services/clinicianService'
import { sessionService, type BookingResponse } from '../../../services/sessionService'
import { walletService, type WalletBalance } from '../../../services/walletService'
import { WalletTopUpModal, paymentCss } from './ModernPaymentUI'
import { StepBar, type FinderStep, type SessionMode, type PayMethod, todayStr } from './shared'
import {
  Step1Preferences,
  Step2Narrative,
  Step3Matches,
  Step4SlotPicker,
  Step5Payment,
  Step7Success,
} from './FinderSteps'

interface FinderFlowProps {
  onBack: () => void
}

// ── In-Flow Top-Up Modal ───────────────────────────────────────────
// Shown when wallet balance < session price.
// Calls Wallet/topup, then auto-fires booking on success.
interface TopUpModalProps {
  shortfall: number
  walletBalance: number
  onSuccess: () => void
  onClose: () => void
}

const InFlowTopUpModal: React.FC<TopUpModalProps> = ({ shortfall, walletBalance, onSuccess, onClose }) => {
  const [upiId,     setUpiId]     = useState('')
  const [step,      setStep]      = useState<'input' | 'processing' | 'done'>('input')
  const [error,     setError]     = useState<string | null>(null)

  const patientId = localStorage.getItem('patientId') ?? localStorage.getItem('userId') ?? ''

  const handleTopUp = async () => {
    if (!upiId.trim()) { setError('Please enter a UPI ID.'); return }
    setStep('processing')
    setError(null)
    try {
      await walletService.topUp({
        userId:        patientId,
        amount:        shortfall,
        paymentMethod: 'UPI',
        gatewayReference: `UPI-${upiId.trim()}-${Date.now()}`,
      })
      setStep('done')
      // Auto-confirm booking after 1.2s so user sees the success tick
      setTimeout(() => onSuccess(), 1200)
    } catch (err) {
      setStep('input')
      setError(err instanceof Error ? err.message : 'Top-up failed. Try again.')
    }
  }

  return (
    // Backdrop
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.55)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: 'white', borderRadius: 20, width: '100%', maxWidth: 460,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--forest), #40916C)',
          padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Top Up & Pay</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'white', marginTop: 2 }}>₹{shortfall.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Wallet after top-up</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginTop: 2 }}>
              ₹{(walletBalance + shortfall).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 28px 24px' }}>
          {step === 'done' ? (
            // Success state
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--forest)', margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
              }}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--charcoal)' }}>Wallet topped up!</p>
              <p style={{ fontSize: 13, color: 'var(--n-400)', marginTop: 6 }}>Confirming your booking…</p>
            </div>
          ) : step === 'processing' ? (
            // Processing state
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--charcoal)' }}>Verifying payment…</p>
              <p style={{ fontSize: 12, color: 'var(--n-400)', marginTop: 6 }}>Do not close this window</p>
            </div>
          ) : (
            // UPI input state
            <>
              {/* Shortfall warning */}
              <div style={{
                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 22,
                display: 'flex', gap: 10, alignItems: 'center', fontSize: 13,
              }}>
                <span>⚠️</span>
                <span style={{ color: '#92600A' }}>
                  Wallet short by <strong>₹{shortfall.toLocaleString()}</strong>. Top up to confirm your session.
                </span>
              </div>

              {/* UPI input */}
              <label className="label" style={{ marginBottom: 8, display: 'block' }}>⚡ UPI ID</label>
              <input
                className="input"
                placeholder="yourname@upi"
                value={upiId}
                onChange={e => { setUpiId(e.target.value); setError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleTopUp()}
                style={{ marginBottom: 8 }}
              />
              {/* Quick bank suffixes */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {['@okicici', '@okhdfcbank', '@ybl', '@okaxis'].map(sfx => (
                  <button
                    key={sfx}
                    onClick={() => setUpiId(v => v.split('@')[0] + sfx)}
                    style={{
                      padding: '4px 10px', borderRadius: 20, border: '1px solid var(--n-200)',
                      background: 'var(--n-50)', fontSize: 11, cursor: 'pointer', color: 'var(--n-500)',
                    }}
                  >{sfx}</button>
                ))}
              </div>

              {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 16 }}>{error}</p>}

              <button
                className="btn btn-forest"
                style={{ width: '100%', padding: '14px 0', fontSize: 14, borderRadius: 14 }}
                disabled={!upiId.trim()}
                onClick={handleTopUp}
              >
                Pay ₹{shortfall.toLocaleString()} & Confirm Booking
              </button>

              <button
                onClick={onClose}
                style={{ display: 'block', width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--n-400)', padding: '8px 0' }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main FinderFlow ────────────────────────────────────────────────
const FinderFlow: React.FC<FinderFlowProps> = ({ onBack }) => {
  const [step,               setStep]               = useState<FinderStep>(1)
  const [matches,            setMatches]            = useState<MatchResult[]>([])
  const [availableSlots,     setAvailableSlots]     = useState<AvailableSlot[]>([])
  const [selectedClinician,  setSelectedClinician]  = useState<MatchResult | null>(null)
  const [selectedSlot,       setSelectedSlot]       = useState<string | null>(null)
  const [selectedMode,       setSelectedMode]       = useState<SessionMode>('video')
  const [concernNote,        setConcernNote]        = useState('')
  const [narrative,          setNarrative]          = useState('')
  const [meetLinkInput,      setMeetLinkInput]      = useState('')
  const [bookingResult,      setBookingResult]      = useState<BookingResponse | null>(null)
  const [isLoading,          setIsLoading]          = useState(false)
  const [walletBalance,      setWalletBalance]      = useState<WalletBalance | null>(null)
  const [loadingSlots,       setLoadingSlots]       = useState(false)
  const [selectedDate,       setSelectedDate]       = useState<string>(todayStr)

  // ── Top-up modal state ─────────────────────────────────────────
  const [showTopUpModal,   setShowTopUpModal]   = useState(false)
  const [topUpShortfall,   setTopUpShortfall]   = useState(0)
  // Pending pay method — resumed after top-up completes
  const [pendingPayMethod, setPendingPayMethod] = useState<PayMethod | null>(null)

  const [formData, setFormData] = useState({ ageGroup: '26 – 40', language: 'English', location: '' })

  const patientId = localStorage.getItem('patientId') ?? localStorage.getItem('userId') ?? ''

  useEffect(() => {
    if (!patientId) return
    walletService.getBalance(patientId)
      .then(setWalletBalance)
      .catch(() => setWalletBalance(null))
  }, [patientId])

  const goStep = (s: FinderStep) => {
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Step 2 → 3: fetch matches ──────────────────────────────────
  const handleMatch = async () => {
    setIsLoading(true)
    try {
      const data = await clinicianService.getMatches(patientId, { language: formData.language })
      setMatches(data)
    } catch {
      setMatches([])
    } finally {
      setIsLoading(false)
      goStep(3)
    }
  }

  // ── Step 3 → 4: fetch slots ────────────────────────────────────
  const handleSelectClinician = async (c: MatchResult) => {
    setSelectedClinician(c)
    setLoadingSlots(true)
    setSelectedSlot(null)

    const fetchForDate = async (dateStr: string): Promise<AvailableSlot[]> => {
      const start = new Date(dateStr + 'T00:00:00').toISOString()
      const end   = new Date(dateStr + 'T23:59:59').toISOString()
      return clinicianService.getAvailableSlots(c.clinicianId, start, end)
    }

    try {
      const todaySlots = await fetchForDate(todayStr)
      if (todaySlots.length === 0) {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]
        setSelectedDate(tomorrowStr)
        setAvailableSlots(await fetchForDate(tomorrowStr))
      } else {
        setSelectedDate(todayStr)
        setAvailableSlots(todaySlots)
      }
    } catch {
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
      goStep(4)
    }
  }

  const handleDateChange = async (dateStr: string) => {
    if (!selectedClinician) return
    setSelectedDate(dateStr)
    setSelectedSlot(null)
    setLoadingSlots(true)
    try {
      const start = new Date(dateStr + 'T00:00:00').toISOString()
      const end   = new Date(dateStr + 'T23:59:59').toISOString()
      setAvailableSlots(await clinicianService.getAvailableSlots(selectedClinician.clinicianId, start, end))
    } catch {
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  // ── Core booking logic — called directly OR after top-up ───────
  const executeBooking = async (payMethod: PayMethod) => {
    if (!selectedSlot || !selectedClinician || !patientId) return
    setIsLoading(true)
    try {
      const r = await sessionService.book({
        patientId,
        clinicianId:  selectedClinician.clinicianId,
        sessionDate:  selectedSlot,
        sessionType:  'Initial Session',
        amount:       selectedClinician.hourlyRate,                  // ✅ FIXED
        notes:        `${concernNote} | ${narrative} | Mode:${selectedMode} | Pay:${payMethod}`,
        meetLink:     meetLinkInput.trim() || undefined,
      })
      setBookingResult(r)
      // Refresh wallet balance after payment
      walletService.getBalance(patientId).then(setWalletBalance).catch(() => {})
      goStep(7)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Booking failed. Please retry.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 5: Confirm & Pay handler ─────────────────────────────
  // FIX: replaced alert() with InFlowTopUpModal.
  // FIX: isLoading guard prevents double-click double-debit.
  const handlePaymentConfirm = async (payMethod: PayMethod) => {
    if (isLoading) return  // ✅ double-click guard

    if (payMethod === 'Wallet') {
      const sessionPrice   = selectedClinician!.hourlyRate           // ✅ FIXED
      const currentBalance = walletBalance?.balance ?? 0

      if (currentBalance < sessionPrice) {
        // ✅ FIX: show in-flow modal instead of alert()
        // Booking state is preserved — modal calls executeBooking on success
        setPendingPayMethod(payMethod)
        setTopUpShortfall(sessionPrice - currentBalance)
        setShowTopUpModal(true)
        return
      }
    }

    await executeBooking(payMethod)
  }

  // Called by InFlowTopUpModal after successful top-up
  const handleTopUpSuccess = async () => {
  // 1. Close the modal immediately so the user sees the main flow again
  setShowTopUpModal(false);
  
  // 2. Keep the main loader active so the user doesn't double-click anything
  setIsLoading(true); 

  try {
    // 3. Refresh the wallet balance from the server
    const fresh = await walletService.getBalance(patientId);
    setWalletBalance(fresh);

    // 4. Proceed to the actual booking
    // We use the 'pendingPayMethod' we saved before opening the modal
    await executeBooking(pendingPayMethod ?? 'Wallet');
  } catch (error) {
    console.error("Post-topup synchronization failed:", error);
    // Even if balance refresh fails, we try to book if the money was sent
    await executeBooking(pendingPayMethod ?? 'Wallet');
  } finally {
    // executeBooking handles its own setIsLoading(false), 
    // but we ensure it here as a fallback.
    setIsLoading(false);
  }
};
  return (
    <>
      <div className="page animate-fade-up" style={{ maxWidth: 680, margin: '0 auto' }}>
        <StepBar step={step} />

        {step === 1 && (
          <Step1Preferences
            formData={formData} setFormData={setFormData}
            selectedMode={selectedMode} setSelectedMode={setSelectedMode}
            onBack={onBack} onNext={() => goStep(2)}
          />
        )}

        {step === 2 && (
          <Step2Narrative
            concernNote={concernNote} setConcernNote={setConcernNote}
            narrative={narrative} setNarrative={setNarrative}
            isLoading={isLoading} onBack={() => goStep(1)} onMatch={handleMatch}
          />
        )}

        {step === 3 && (
          <Step3Matches
            matches={matches} onBack={() => goStep(2)}
            onSelectClinician={handleSelectClinician}
          />
        )}

        {step === 4 && selectedClinician && (
          <Step4SlotPicker
            selectedClinician={selectedClinician}
            availableSlots={availableSlots}
            selectedSlot={selectedSlot} setSelectedSlot={setSelectedSlot}
            selectedDate={selectedDate} loadingSlots={loadingSlots}
            onBack={() => goStep(3)} onDateChange={handleDateChange} onNext={() => goStep(5)}
          />
        )}

        {step === 5 && selectedClinician && selectedSlot && (
          <Step5Payment
            clinician={selectedClinician} slot={selectedSlot} mode={selectedMode}
            meetLinkInput={meetLinkInput} onMeetLinkChange={setMeetLinkInput}
            onConfirm={handlePaymentConfirm}
            isLoading={isLoading}
            walletBalance={walletBalance}
            onBack={() => goStep(4)}
          />
        )}

        {step === 7 && bookingResult && selectedClinician && (
          <Step7Success
            bookingResult={bookingResult}
            selectedClinician={selectedClinician}
            onBack={onBack}
          />
        )}
      </div>

      {/* ✅ In-flow top-up modal — only shown when wallet is short */}
      {showTopUpModal && selectedClinician && (
        <>
          <style>{paymentCss}</style>
          <WalletTopUpModal
            isOpen={showTopUpModal}
            onClose={() => setShowTopUpModal(false)}
            shortfall={topUpShortfall}
            walletBalance={walletBalance?.balance ?? 0}
            totalAmount={selectedClinician.hourlyRate || 0}
            onPaymentComplete={handleTopUpSuccess}
          />
        </>
      )}
    </>
  )
}

export default FinderFlow
</file>

<file path="src/pages/patient/components/FinderSteps.tsx">
// ─────────────────────────────────────────────────────────────────
// PATH: src/pages/patient/components/FinderSteps.tsx
//
// FIX (Bug 5): ClinicianCard now passes photoUrl to <Avatar> so the
// clinician's real profile photo is shown when available. Falls back
// to initials (unchanged behaviour) when photoUrl is null/undefined.
//
// All other steps (1, 2, 4, 5, 7) are unchanged.
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { type MatchResult, type AvailableSlot } from '../../../services/clinicianService'
import { type BookingResponse } from '../../../services/sessionService'
import { type WalletBalance } from '../../../services/walletService'
import LoadingSpinner from '../../../components/LoadingSpinner'
import {
  BackBtn,
  Avatar,
  Stars,
  Pill,
  type SessionMode,
  type PayMethod,
  fmtSlot,
  todayStr,
} from './shared'

// ═══════════════════════════════════════════════════════════════════
// STEP 1 – Profile Preferences
// ═══════════════════════════════════════════════════════════════════
interface Step1PreferencesProps {
  formData: { ageGroup: string; language: string; location: string }
  setFormData: React.Dispatch<React.SetStateAction<{ ageGroup: string; language: string; location: string }>>
  selectedMode: SessionMode
  setSelectedMode: (m: SessionMode) => void
  onBack: () => void
  onNext: () => void
}

export const Step1Preferences: React.FC<Step1PreferencesProps> = ({
  formData, setFormData, selectedMode, setSelectedMode, onBack, onNext,
}) => (
  <div className="animate-fade-up">
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 36 }}>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--charcoal)' }}>
        Tell us about yourself
      </h2>
    </div>
    <p style={{ color: 'var(--n-400)', fontSize: 14, marginBottom: 36 }}>
      This helps us find the best match for your needs.
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
      <div className="form-group">
        <label className="label">Age Group</label>
        <select className="input" value={formData.ageGroup} onChange={e => setFormData(p => ({ ...p, ageGroup: e.target.value }))}>
          {['18 – 25', '26 – 40', '41 – 60', '60+'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="label">Preferred Language</label>
        <select className="input" value={formData.language} onChange={e => setFormData(p => ({ ...p, language: e.target.value }))}>
          {['English', 'Malayalam', 'Arabic', 'Hindi', 'Tamil'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    </div>

    <div className="form-group" style={{ marginBottom: 28 }}>
      <label className="label">Location</label>
      <input className="input" type="text" placeholder="e.g. Kochi, Kerala"
        value={formData.location} onChange={e => setFormData(p => ({ ...p, location: e.target.value }))} />
    </div>

    <div className="form-group" style={{ marginBottom: 36 }}>
      <label className="label">Preferred Session Mode</label>
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { val: 'video' as SessionMode, label: '📹 Video' },
          { val: 'voice' as SessionMode, label: '📞 Voice' },
          { val: 'chat'  as SessionMode, label: '💬 Chat'  },
        ].map(m => (
          <button key={m.val} onClick={() => setSelectedMode(m.val)} style={{
            flex: 1, padding: '12px 8px', borderRadius: 14, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            border: `2px solid ${selectedMode === m.val ? 'var(--forest)' : 'var(--n-200)'}`,
            background: selectedMode === m.val ? 'rgba(57,120,106,0.08)' : 'var(--white)',
            color: selectedMode === m.val ? 'var(--forest)' : 'var(--n-500)',
            transition: 'all 0.18s',
          }}>
            {m.label}
          </button>
        ))}
      </div>
    </div>

    <button className="btn btn-forest btn-full btn-lg" onClick={onNext} style={{ borderRadius: 22 }}>
      Continue →
    </button>
  </div>
)

// ═══════════════════════════════════════════════════════════════════
// STEP 2 – Concern Narrative
// ═══════════════════════════════════════════════════════════════════
interface Step2NarrativeProps {
  concernNote: string; setConcernNote: (v: string) => void
  narrative: string; setNarrative: (v: string) => void
  isLoading: boolean; onBack: () => void; onMatch: () => void
}

export const Step2Narrative: React.FC<Step2NarrativeProps> = ({
  concernNote, setConcernNote, narrative, setNarrative, isLoading, onBack, onMatch,
}) => (
  <div className="animate-fade-up">
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 36 }}>
      <BackBtn onClick={onBack} />
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--charcoal)' }}>
        What's on your mind?
      </h2>
    </div>
    <div className="form-group" style={{ marginBottom: 20 }}>
      <label className="label">Primary Concern</label>
      <input className="input" type="text" placeholder="e.g. Anxiety, Work stress, Relationship issues"
        value={concernNote} onChange={e => setConcernNote(e.target.value)} />
    </div>
    <div className="form-group" style={{ marginBottom: 36 }}>
      <label className="label">Tell Us More (Optional)</label>
      <textarea className="input" rows={5} placeholder="Describe what you've been experiencing…"
        value={narrative} onChange={e => setNarrative(e.target.value)}
        style={{ resize: 'vertical', lineHeight: 1.6 }} />
    </div>
    <button className="btn btn-forest btn-full btn-lg" onClick={onMatch} disabled={isLoading} style={{ borderRadius: 22 }}>
      {isLoading ? <LoadingSpinner /> : 'Find My Match →'}
    </button>
  </div>
)

// ═══════════════════════════════════════════════════════════════════
// STEP 3 – Matches
// ═══════════════════════════════════════════════════════════════════
interface Step3MatchesProps {
  matches: MatchResult[]
  onBack: () => void
  onSelectClinician: (c: MatchResult) => void
}

// ✅ FIX (Bug 5): pass photoUrl to Avatar so a real photo shows when available
const ClinicianCard: React.FC<{
  c: MatchResult
  onSelect: (c: MatchResult) => void
}> = ({ c, onSelect }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="card"
      style={{
        padding: '24px 28px',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(57,120,106,0.12)'
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = ''
        ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
      }}
    >
      {/* ── Top row: avatar + info + match score ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        {/* ✅ FIX: pass photoUrl so real photo renders when set */}
        <Avatar name={c.fullName} size={64} photoUrl={c.photoUrl} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Name + match score */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: 20,
              color: 'var(--charcoal)', margin: 0,
            }}>
              {c.fullName}
            </h3>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--forest)', lineHeight: 1 }}>
                {Math.round(c.matchScore)}%
              </div>
              <div style={{ fontSize: 10, color: 'var(--n-400)', marginTop: 1 }}>match</div>
            </div>
          </div>

          {/* Credential + stars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            {c.credential && (
              <span style={{ fontSize: 12, color: 'var(--n-500)', fontWeight: 500 }}>
                {c.credential}
              </span>
            )}
            <Stars />
          </div>

          {/* Specialty + language pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            {c.specialty && <Pill text={c.specialty} />}
            {c.languages && c.languages.split(',').map(l => (
              <Pill key={l.trim()} text={l.trim()} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Expandable bio ── */}
      {c.bio && (
        <div style={{ marginBottom: 14 }}>
          {expanded ? (
            <p style={{
              fontSize: 13, color: 'var(--n-500)', lineHeight: 1.65,
              background: 'var(--n-50)', borderRadius: 10,
              padding: '12px 14px', margin: 0,
            }}>
              {c.bio}
            </p>
          ) : (
            <p style={{
              fontSize: 13, color: 'var(--n-400)', lineHeight: 1.5,
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {c.bio}
            </p>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--forest)', fontWeight: 600,
              padding: '4px 0', marginTop: 4,
            }}
          >
            {expanded ? '▲ Show less' : '▼ View profile'}
          </button>
        </div>
      )}

      {/* ── Bottom row: rate + book button ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', paddingTop: 12,
        borderTop: '1px solid var(--n-100)',
      }}>
        <div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--charcoal)' }}>
            ₹{c.hourlyRate.toLocaleString('en-IN')}
          </span>
          <span style={{ fontSize: 12, color: 'var(--n-400)', marginLeft: 4 }}>/session</span>
        </div>
        <button className="btn btn-forest btn-sm" onClick={() => onSelect(c)}>
          Book Session →
        </button>
      </div>
    </div>
  )
}

export const Step3Matches: React.FC<Step3MatchesProps> = ({ matches, onBack, onSelectClinician }) => (
  <div className="animate-fade-up">
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 36 }}>
      <BackBtn onClick={onBack} />
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--charcoal)' }}>Your Matches</h2>
        <p style={{ color: 'var(--n-400)', fontSize: 14 }}>
          {matches.length} clinician{matches.length !== 1 ? 's' : ''} found
        </p>
      </div>
    </div>

    {matches.length === 0 ? (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--n-400)' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <p>No matches found. Try adjusting your preferences.</p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {matches.map(c => (
          <ClinicianCard key={c.clinicianId} c={c} onSelect={onSelectClinician} />
        ))}
      </div>
    )}
  </div>
)

// ═══════════════════════════════════════════════════════════════════
// STEP 4 – Slot Picker
// ═══════════════════════════════════════════════════════════════════
interface Step4SlotPickerProps {
  selectedClinician: MatchResult
  availableSlots: AvailableSlot[]
  selectedSlot: string | null; setSelectedSlot: (s: string | null) => void
  selectedDate: string; loadingSlots: boolean
  onBack: () => void; onDateChange: (d: string) => void; onNext: () => void
}

export const Step4SlotPicker: React.FC<Step4SlotPickerProps> = ({
  selectedClinician, availableSlots, selectedSlot, setSelectedSlot,
  selectedDate, loadingSlots, onBack, onDateChange, onNext,
}) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    return { iso: d.toISOString().split('T')[0], label: d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }) }
  })

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 36 }}>
        <BackBtn onClick={onBack} />
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 38, color: 'var(--charcoal)' }}>Pick a Slot</h2>
          <p style={{ color: 'var(--n-400)', fontSize: 14 }}>{selectedClinician.fullName}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto' }}>
        {days.map(d => (
          <button key={d.iso} onClick={() => onDateChange(d.iso)} style={{
            flexShrink: 0, padding: '10px 14px', borderRadius: 14, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600,
            border: `2px solid ${selectedDate === d.iso ? 'var(--forest)' : 'var(--n-200)'}`,
            background: selectedDate === d.iso ? 'var(--forest)' : 'white',
            color: selectedDate === d.iso ? 'white' : 'var(--n-500)',
          }}>
            {d.label}
          </button>
        ))}
      </div>

      {loadingSlots ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><LoadingSpinner /></div>
      ) : availableSlots.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--n-400)' }}>No slots available for this date.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 28 }}>
          {availableSlots.filter(s => !s.isBooked).map(s => {
            const t = new Date(s.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            return (
              <button key={s.slotId} onClick={() => setSelectedSlot(s.startTime)} style={{
                padding: '12px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
                border: `2px solid ${selectedSlot === s.startTime ? 'var(--forest)' : 'var(--n-200)'}`,
                background: selectedSlot === s.startTime ? 'rgba(57,120,106,0.08)' : 'white',
                color: selectedSlot === s.startTime ? 'var(--forest)' : 'var(--charcoal)',
              }}>
                {t}
              </button>
            )
          })}
        </div>
      )}

      <button className="btn btn-forest btn-full btn-lg" style={{ borderRadius: 22 }}
        disabled={!selectedSlot} onClick={onNext}>
        Continue to Payment →
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// STEP 5 – Payment
// ═══════════════════════════════════════════════════════════════════
export const Step5Payment: React.FC<{
  clinician: MatchResult
  slot: string
  mode: SessionMode
  meetLinkInput: string
  onMeetLinkChange: (val: string) => void
  onConfirm: (m: PayMethod) => void
  isLoading: boolean
  walletBalance?: WalletBalance | null
  onBack: () => void
}> = ({ clinician, slot, mode, meetLinkInput, onMeetLinkChange, onConfirm, isLoading, walletBalance, onBack }) => {
  const [method, setMethod] = useState<PayMethod | null>(null)
  const [upiId,  setUpiId]  = useState('')

  const { time, date } = fmtSlot(slot)
  const amount = clinician.hourlyRate

  const MODES: Record<SessionMode, string> = {
    video: '📹 Video Call',
    voice: '📞 Voice Call',
    chat:  '💬 Chat',
  }

  const OPTS: { id: PayMethod; icon: string; label: string; desc: string }[] = [
    { id: 'UPI',        icon: '⚡', label: 'UPI',                 desc: 'Instant via UPI ID' },
    { id: 'Card',       icon: '💳', label: 'Credit / Debit Card', desc: 'Visa, Mastercard, RuPay' },
    { id: 'NetBanking', icon: '🏦', label: 'Net Banking',         desc: 'All major banks' },
    { id: 'Wallet',     icon: '👜', label: 'Wallet',              desc: 'Paytm, PhonePe, GPay' },
  ]

  const walletAvailable = walletBalance?.available ?? 0
  const walletShort     = walletAvailable < amount

  const ProceedStepper = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
      {(['Therapist Profile', 'Booking Details', 'Payment'] as const).map((label, i) => (
        <React.Fragment key={label}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--forest)', border: '2px solid var(--forest)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'white',
            }}>
              {i < 2 ? '✓' : '3'}
            </div>
            <span style={{ fontSize: 12, fontWeight: i === 2 ? 700 : 500, color: i === 2 ? 'var(--charcoal)' : 'var(--n-400)' }}>
              {label}
            </span>
          </div>
          {i < 2 && <div style={{ width: 36, height: 2, background: 'var(--forest)' }} />}
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <div className="animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
        <BackBtn onClick={onBack} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>Payment Details</h2>
      </div>

      <ProceedStepper />

      {/* Booking summary card */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
          <Avatar name={clinician.fullName} size={56} photoUrl={clinician.photoUrl} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 2 }}>{clinician.fullName}</h3>
            <p style={{ fontSize: 13, color: 'var(--n-500)' }}>{clinician.specialty || 'Clinical Psychologist'}</p>
          </div>
        </div>
        <div style={{ background: 'var(--n-50)', borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--n-400)', marginBottom: 12 }}>
            Booking Summary
          </p>
          {[
            { l: 'Date',     v: date },
            { l: 'Time',     v: time },
            { l: 'Mode',     v: MODES[mode] },
            { l: 'Duration', v: '60 min' },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--n-500)' }}>{r.l}</span>
              <span style={{ fontWeight: 600, color: 'var(--charcoal)' }}>{r.v}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--n-200)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--forest)' }}>
              ₹{amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Meet link */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <label className="label" style={{ marginBottom: 10, display: 'block' }}>🔗 Meeting Link (Optional)</label>
        <input className="input" placeholder="https://zoom.us/j/... or meet.google.com/..."
          value={meetLinkInput} onChange={e => onMeetLinkChange(e.target.value)} />
        <p style={{ fontSize: 11, color: 'var(--n-300)', marginTop: 6 }}>
          Add a Zoom or Google Meet link now, or it can be added later by your clinician.
        </p>
      </div>

      {/* Payment method */}
      <div className="card" style={{ padding: 28, marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 16 }}>Payment Method</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {OPTS.map(opt => (
            <button
              key={opt.id}
              onClick={() => setMethod(opt.id)}
              style={{
                padding: '14px 14px', borderRadius: 16, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 10,
                border: `2px solid ${method === opt.id ? 'var(--forest)' : 'var(--n-200)'}`,
                background: method === opt.id ? 'rgba(57,120,106,0.06)' : 'var(--white)',
                transition: 'all 0.18s',
              }}
            >
              <span style={{ fontSize: 22 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: method === opt.id ? 'var(--forest)' : 'var(--charcoal)' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 1 }}>{opt.desc}</div>
                {opt.id === 'Wallet' && method === opt.id && (
                  <div style={{ fontSize: 11, marginTop: 4, fontWeight: 700, color: walletShort ? 'var(--danger)' : 'var(--forest)' }}>
                    Bal: ₹{walletAvailable.toLocaleString('en-IN')}
                    {walletShort && <span style={{ marginLeft: 4 }}>⚠️ Top-up required</span>}
                  </div>
                )}
              </div>
              {method === opt.id && (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'var(--forest)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 10, color: 'white', flexShrink: 0,
                }}>✓</div>
              )}
            </button>
          ))}
        </div>

        {method === 'UPI' && (
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label">Enter UPI ID</label>
            <input className="input" placeholder="yourname@upi"
              value={upiId} onChange={e => setUpiId(e.target.value)} />
          </div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(57,120,106,0.06)', border: '1px solid rgba(57,120,106,0.14)',
          borderRadius: 12, padding: '12px 16px', fontSize: 12, color: 'var(--forest)',
        }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span>Secured by <strong>256-bit SSL</strong>. Cognantic never stores card details.</span>
        </div>
      </div>

      <button
        className="btn btn-forest btn-full btn-lg"
        style={{ borderRadius: 22, letterSpacing: '0.1em', marginTop: 20 }}
        disabled={isLoading || !method}
        onClick={() => method && onConfirm(method)}
      >
        {isLoading
          ? 'Processing...'
          : method === 'Wallet' && walletShort
          ? `Top Up & Pay ₹${amount.toLocaleString('en-IN')} →`
          : 'Confirm & Pay'}
      </button>

      {method === 'Wallet' && walletShort && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--n-400)', marginTop: 10 }}>
          ⚡ A UPI top-up screen will open — your booking is saved
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// STEP 7 – Success / Confirmation with embedded Zoom
// ═══════════════════════════════════════════════════════════════════
interface Step7SuccessProps {
  bookingResult: BookingResponse
  selectedClinician: MatchResult
  onBack: () => void
}

export const Step7Success: React.FC<Step7SuccessProps> = ({ bookingResult, selectedClinician, onBack }) => {
  const [showEmbed, setShowEmbed] = useState(false)

  return (
    <div className="animate-scale-in" style={{ textAlign: 'center', paddingTop: 40 }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', background: 'var(--n-100)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, margin: '0 auto 28px', border: '2px solid var(--n-200)',
      }}>✓</div>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 52, color: 'var(--charcoal)', marginBottom: 16 }}>
        Confirmed!
      </h2>

      <p style={{ color: 'var(--n-500)', fontSize: 15, lineHeight: 1.7, marginBottom: 6 }}>
        Your session with{' '}
        <strong style={{ color: 'var(--charcoal)' }}>{bookingResult.clinicianName}</strong>
        {' '}is set for{' '}
        {(() => {
          const { time, date } = fmtSlot(bookingResult.scheduledAt)
          return (
            <>
              <strong style={{ color: 'var(--charcoal)' }}>{time}</strong> on{' '}
              <strong style={{ color: 'var(--forest)' }}>{date}</strong>.
            </>
          )
        })()}
      </p>

      {bookingResult.confirmationCode && (
        <p style={{ fontSize: 12, color: 'var(--n-400)', marginBottom: 32 }}>
          Confirmation:{' '}
          <span style={{ color: 'var(--forest)', fontWeight: 700, letterSpacing: '0.05em' }}>
            {bookingResult.confirmationCode}
          </span>
        </p>
      )}

      <div style={{
        background: 'rgba(57,120,106,0.05)', border: '1.5px solid rgba(57,120,106,0.18)',
        borderRadius: 20, padding: 28, maxWidth: 480, margin: '0 auto 36px', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📹</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Session Link</div>
            <div style={{ fontSize: 12, color: 'var(--n-400)' }}>
              {bookingResult.meetLink
                ? 'Join directly inside Cognantic or open in a new tab'
                : 'Available 15 mins before session starts'}
            </div>
          </div>
        </div>

        {bookingResult.meetLink ? (
          <>
            {showEmbed ? (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
                <iframe
                  src={bookingResult.meetLink}
                  allow="camera; microphone; fullscreen; display-capture; autoplay"
                  style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
                  title="Session Call"
                />
                <button
                  onClick={() => setShowEmbed(false)}
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
              <>
                <div style={{ background: 'white', border: '1px solid var(--n-200)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'var(--n-600)', wordBreak: 'break-all', marginBottom: 14 }}>
                  {bookingResult.meetLink}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-forest" style={{ flex: 1, borderRadius: 12 }} onClick={() => setShowEmbed(true)}>
                    📹 Join In-App
                  </button>
                  <button className="btn btn-outline" style={{ flex: 1, borderRadius: 12 }} onClick={() => window.open(bookingResult.meetLink!, '_blank')}>
                    ↗ New Tab
                  </button>
                  <button className="btn btn-outline" style={{ padding: '12px 16px', borderRadius: 12 }} onClick={() => navigator.clipboard.writeText(bookingResult.meetLink!)}>
                    Copy
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--n-400)', textAlign: 'center', padding: '8px 0' }}>
            Your clinician will add the meeting link before the session. It will appear in your dashboard.
          </div>
        )}
      </div>

      <button className="btn btn-outline btn-lg" onClick={onBack}>Go to Dashboard</button>
    </div>
  )
}
</file>

<file path="src/pages/patient/components/ModernPaymentUI.tsx">
// src/pages/patient/components/ModernPaymentUI.tsx

import { useState, useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface ProfileChipProps {
  user: {
    name: string
    role: string
    avatarUrl: string | null
    email?: string
  }
}

interface QRCodeProps {
  value?: string
}

interface ModernPaymentUIProps {
  amount?: number
  walletBalance?: number
  onSuccess?: () => void
}

interface PayButtonProps {
  amount: number
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled: boolean
  label?: string
}

interface WalletTopUpModalProps {
  isOpen: boolean
  onClose: () => void
  shortfall?: number
  walletBalance?: number
  totalAmount?: number
  onPaymentComplete?: () => void
}

interface RippleState {
  x: number
  y: number
}

// ─────────────────────────────────────────────────────────
// COGNANTIC DESIGN TOKENS
// ─────────────────────────────────────────────────────────

const C = {
  green:      '#2D6A4F',
  greenLight: '#52B788',
  greenMid:   '#40916C',
  cream:      '#F0EDE6',
  creamDark:  '#E8E4DB',
  charcoal:   '#1A1A1A',
  slate:      '#6B7280',
  gold:       '#D4A017',
  danger:     '#E63946',
  white:      '#FFFFFF',
}

export const paymentCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes checkPop {
    0%   { transform: scale(0); opacity: 0; }
    70%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }

  .pm-slide-up { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .pm-fade-in  { animation: fadeIn 0.25s ease both; }
`

// ─────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────

function Spinner({ size = 18, color = C.white }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2.5px solid ${color}40`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function CheckCircle({ size = 52 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'checkPop 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PROFILE CHIP
// ─────────────────────────────────────────────────────────

export function ProfileChip({ user }: ProfileChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = user.name.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const roleColor: Record<string, string> = {
    admin: C.danger, clinician: C.greenMid, patient: C.gold,
  }
  const color = roleColor[user.role] ?? C.slate

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 14px 6px 6px',
          background: C.white, border: `1.5px solid ${C.creamDark}`,
          borderRadius: 100, cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: open ? `0 0 0 3px ${C.greenLight}30` : 'none',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.white, fontWeight: 600, fontSize: 13, letterSpacing: 0.5, flexShrink: 0,
        }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
            : initials}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal, whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color }}>
            {user.role}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.slate} strokeWidth="2.5"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="pm-slide-up" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: C.white, border: `1px solid ${C.creamDark}`,
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minWidth: 200, overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.creamDark}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal }}>{user.name}</div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
              {user.email ?? 'support@cognantic.com'}
            </div>
          </div>
          {(['👤 My Profile', '⚙️ Settings', '🔔 Notifications', '❓ Help & Support'] as const)
            .map(label => (
              <button key={label} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '11px 16px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, color: C.charcoal, textAlign: 'left',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {label}
              </button>
            ))}
          <div style={{ height: 1, background: C.creamDark, margin: '4px 0' }} />
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '11px 16px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, color: C.danger, textAlign: 'left',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFF0F0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={C.danger} strokeWidth="2">
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

// ─────────────────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────────────────

function QRCode({ value = 'upi://pay?pa=cognantic@upi&pn=Cognantic&am=500' }: QRCodeProps) {
  const seed = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = (n: number) => {
    const x = Math.sin(n + seed) * 10000
    return x - Math.floor(x)
  }
  const SIZE = 21
  const cells = Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c >= SIZE - 7) || (r >= SIZE - 7 && c < 7)) return true
      return rng(r * SIZE + c) > 0.5
    })
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        background: C.white, padding: 12, borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <svg width={168} height={168} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {cells.map((row, r) =>
            row.map((on, c) => on
              ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={C.charcoal} />
              : null
            )
          )}
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.slate }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: C.greenLight, animation: 'pulse 1.5s ease infinite',
        }} />
        Scan with any UPI app
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PAY BUTTON
// ─────────────────────────────────────────────────────────

function PayButton({ amount, onClick, disabled, label = 'Pay' }: PayButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 16, width: '100%', padding: '14px',
        background: disabled
          ? '#C0C0B8'
          : `linear-gradient(135deg, ${C.green}, ${C.greenMid})`,
        color: C.white, border: 'none', borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 15, fontWeight: 700,
        letterSpacing: 0.3, transition: 'all 0.2s',
        boxShadow: disabled ? 'none' : '0 4px 16px rgba(45,106,79,0.3)',
      }}
    >
      {label} ₹{amount}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// MODERN PAYMENT UI
// ─────────────────────────────────────────────────────────

export function ModernPaymentUI({ amount = 500, walletBalance = 0, onSuccess }: ModernPaymentUIProps) {
  const [tab,    setTab]    = useState<'upi' | 'wallet' | 'card'>('upi')
  const [upiId,  setUpiId]  = useState('')
  const [step,   setStep]   = useState<'input' | 'confirming' | 'success'>('input')
  const [, setRipple] = useState<RippleState | null>(null)

  const handlePay = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setStep('confirming')
    await new Promise(r => setTimeout(r, 2200))
    setStep('success')
    setTimeout(() => onSuccess?.(), 1500)
  }

  const gpayApps: { name: string; color: string; emoji: string }[] = [
    { name: 'GPay',    color: '#4285F4', emoji: '🔵' },
    { name: 'PhonePe', color: '#5F259F', emoji: '🟣' },
    { name: 'Paytm',   color: '#00BAF2', emoji: '🔷' },
    { name: 'BHIM',    color: '#138808', emoji: '🟢' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${C.creamDark}`, borderRadius: 10,
    fontSize: 14, outline: 'none',
  }

  if (step === 'success') {
    return (
      <div className="pm-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, padding: '40px 24px',
      }}>
        <CheckCircle size={64} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.charcoal }}>
            ₹{amount} Added!
          </div>
          <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
            Booking payment is processing…
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirming') {
    return (
      <div className="pm-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, padding: '40px 24px',
      }}>
        <Spinner size={40} color={C.green} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.charcoal }}>Verifying payment…</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Do not close this window</div>
        </div>
        <div style={{
          background: C.cream, borderRadius: 10, padding: '10px 20px',
          fontSize: 13, color: C.slate,
        }}>
          Adding ₹{amount} to your Cognantic Wallet
        </div>
      </div>
    )
  }

  return (
    <div className="pm-slide-up">
      {/* Amount Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenMid} 100%)`,
        borderRadius: '16px 16px 0 0', padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: `${C.white}80`, letterSpacing: 1, textTransform: 'uppercase' }}>
            Top-up Amount
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.white }}>
            ₹{amount}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: `${C.white}70`, letterSpacing: 0.5 }}>Wallet after top-up</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: `${C.white}E0` }}>
            ₹{walletBalance + amount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.creamDark}`, background: C.white }}>
        {([
          { id: 'upi',    label: '⚡ UPI / QR' },
          { id: 'wallet', label: '👛 Wallets'  },
          { id: 'card',   label: '💳 Card'     },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '13px 8px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: tab === t.id ? 600 : 500,
            color: tab === t.id ? C.green : C.slate,
            borderBottom: `2.5px solid ${tab === t.id ? C.green : 'transparent'}`,
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '24px', background: C.white, minHeight: 280 }}>

        {/* UPI Tab */}
        {tab === 'upi' && (
          <div className="pm-fade-in" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <QRCode value={`upi://pay?pa=cognantic@upi&pn=Cognantic&am=${amount}`} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: 0.5, marginBottom: 10 }}>
                OR ENTER UPI ID
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  value={upiId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  style={{
                    ...inputStyle,
                    padding: '12px 44px 12px 14px',
                    borderColor: upiId ? C.greenLight : C.creamDark,
                    transition: 'border-color 0.2s',
                  }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>⚡</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {['@okicici', '@okhdfcbank', '@ybl', '@okaxis'].map(suffix => (
                  <button key={suffix}
                    onClick={() => setUpiId(v => v.split('@')[0] + suffix)}
                    style={{
                      padding: '5px 10px', borderRadius: 20,
                      border: `1px solid ${C.creamDark}`, background: C.cream,
                      fontSize: 11, cursor: 'pointer', color: C.slate, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.green; e.currentTarget.style.color = C.white }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.slate }}
                  >
                    {suffix}
                  </button>
                ))}
              </div>
              <PayButton amount={amount} onClick={handlePay} disabled={!upiId} label="Pay via UPI" />
            </div>
          </div>
        )}

        {/* Wallets Tab */}
        {tab === 'wallet' && (
          <div className="pm-fade-in">
            <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: 0.5, marginBottom: 16 }}>
              SELECT WALLET APP
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {gpayApps.map(app => (
                <button key={app.name} onClick={handlePay} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 12,
                  border: `1.5px solid ${C.creamDark}`, background: C.white,
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = app.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${app.color}20` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.creamDark; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${app.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {app.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.charcoal }}>{app.name}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>Redirect to app</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: C.slate, textAlign: 'center' }}>
              You will be redirected to complete payment
            </div>
          </div>
        )}

        {/* Card Tab */}
        {tab === 'card' && (
          <div className="pm-fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
                  CARD NUMBER
                </label>
                <input placeholder="4242 4242 4242 4242" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
                    EXPIRY
                  </label>
                  <input placeholder="MM / YY" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
                    CVV
                  </label>
                  <input placeholder="• • •" type="password" maxLength={3} style={inputStyle} />
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: C.cream, borderRadius: 10, fontSize: 12, color: C.slate,
              }}>
                🔒 Secured by 256-bit SSL · Cognantic never stores card details
              </div>
              <PayButton amount={amount} onClick={handlePay} disabled={false} label="Add ₹" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// WALLET TOP-UP MODAL
// ─────────────────────────────────────────────────────────

export function WalletTopUpModal({
  isOpen,
  onClose,
  shortfall = 285,
  walletBalance = 0,
  totalAmount = 0,
  onPaymentComplete,
}: WalletTopUpModalProps) {
  const [topUpDone,   setTopUpDone]   = useState(false)
  const [autoPaying,  setAutoPaying]  = useState(false)

  const handleTopUpSuccess = async () => {
    setTopUpDone(true)
    setAutoPaying(true)
    await new Promise(r => setTimeout(r, 1800))
    onPaymentComplete?.()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20,
      animation: 'fadeIn 0.2s ease both',
    }}>
      <div className="pm-slide-up" style={{
        background: C.white, borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: `1px solid ${C.creamDark}`,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.charcoal }}>Top Up & Pay</div>
            <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
              Add ₹{shortfall} to complete your booking
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: 'none', background: C.cream,
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Shortfall Banner */}
        {!topUpDone && (
          <div style={{
            margin: '0 24px', marginTop: 16, padding: '12px 16px',
            background: '#FFF8E6', borderRadius: 10, border: `1px solid ${C.gold}40`,
            display: 'flex', gap: 10, alignItems: 'center', fontSize: 13,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <span style={{ fontWeight: 600, color: '#92600A' }}>Wallet short by ₹{shortfall}</span>
              <span style={{ color: '#A07030' }}> — top up to proceed with your ₹{totalAmount} booking</span>
            </div>
          </div>
        )}

        {/* Auto-pay Success */}
        {autoPaying && (
          <div className="pm-fade-in" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <CheckCircle size={56} />
            <div style={{ marginTop: 16, fontSize: 17, fontWeight: 700, color: C.charcoal }}>
              Wallet topped up! 🎉
            </div>
            <div style={{ fontSize: 13, color: C.slate, marginTop: 6 }}>
              Confirming your booking…
            </div>
            <div style={{ marginTop: 16 }}>
              <Spinner size={22} color={C.green} />
            </div>
          </div>
        )}

        {/* Payment UI */}
        {!autoPaying && (
          <div style={{ padding: '0 0 24px 0' }}>
            <ModernPaymentUI
              amount={shortfall}
              walletBalance={walletBalance}
              onSuccess={handleTopUpSuccess}
            />
          </div>
        )}

        {/* Security Footer */}
        {!autoPaying && (
          <div style={{
            margin: '0 24px 20px', padding: '10px 14px',
            background: C.cream, borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.slate,
          }}>
            🔒 &nbsp;After top-up, your booking is confirmed <strong>automatically</strong> — no second click needed
          </div>
        )}
      </div>
    </div>
  )
}
</file>

<file path="src/pages/patient/components/shared.tsx">
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
</file>

<file path="src/pages/patient/components/WalletCard.tsx">
// ─────────────────────────────────────────────────────────────────
// PATH: src/pages/patient/components/WalletCard.tsx
//
// FIX (Bug 4 — wallet transaction amount not shown / balance stays ₹0):
//
//   Root cause A (server — fixed in Wallet_TopUp.cs):
//     ctx.Dispose() in finally{} killed the EF context mid-retry →
//     "Cannot access a disposed object: ManualResetEventSlim" → 400.
//
//   Root cause B (client — fixed here):
//     After handlePaymentSuccess confirms success from the backend, it
//     calls onTopUp() immediately inside the same 1.5 s animation window.
//     onTopUp() triggers fetchWallet() which fires GET /Wallet/balance
//     before Supabase's session-pooler connection finishes flushing the
//     committed row — so the balance query still returns the old value.
//
//     Fix: add a 500 ms pause before calling onTopUp() so the DB read
//     happens after the write is fully visible to subsequent connections.
//
//   Root cause C (client — fixed here):
//     The "Session rate" sub-label was reading
//       wallet?.recentTransactions?.[0]?.amount
//     which shows the first *transaction* amount (e.g. ₹3000) rather than
//     the actual per-session rate. Changed to a static label so it never
//     shows a misleading number.
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { walletService, type WalletBalance } from '../../../services/walletService'
import { ModernPaymentUI, paymentCss } from './ModernPaymentUI'

interface WalletCardProps {
  balance:        WalletBalance | null
  onTopUp:        () => void           // triggers fetchWallet() in DashboardView
  wallet:         WalletBalance | null
  showTopUp:      boolean
  setShowTopUp:   (v: boolean) => void
  topUpAmount:    string
  setTopUpAmount: (v: string) => void
  topUpLoading:   boolean
  handleTopUp:    (method: string) => void
  patientId:      string
}

const inr = (n: number) =>
  '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const WalletCard: React.FC<WalletCardProps> = ({
  balance,
  onTopUp,
  wallet,
  showTopUp,
  setShowTopUp,
  topUpAmount,
  setTopUpAmount,
  patientId,
}) => {
  const [topUpStep,    setTopUpStep]    = useState<'idle' | 'success'>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  if (!balance) {
    return (
      <div className="card" style={{ padding: 20 }}>
        Loading Wallet...
      </div>
    )
  }

  // ── handlePaymentSuccess ──────────────────────────────────────
  // Called by ModernPaymentUI's onSuccess after its internal UX animation.
  // This is the single place that calls the real backend topUp API.
  const handlePaymentSuccess = async () => {
    const amount = Number(topUpAmount)
    if (!amount || amount <= 0) {
      setSubmitError('Please enter a valid top-up amount.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await walletService.topUp({
        userId:        patientId,
        amount,
        paymentMethod: 'UPI',
      })

      // Backend confirmed — show success tick
      setTopUpStep('success')

      setTimeout(() => {
        setTopUpStep('idle')
        setShowTopUp(false)
        setTopUpAmount('')

        // ✅ FIX (Bug 4-B): wait 500 ms before re-fetching so the Supabase
        // session-pooler connection has time to flush the committed row.
        // Without this delay fetchWallet() can read stale data and show ₹0.
        setTimeout(() => onTopUp(), 500)
      }, 1500)

    } catch (err) {
      // Surface real error from backend (inner exception chain)
      const msg = err instanceof Error ? err.message : 'Top-up failed. Please try again.'
      setSubmitError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="card" style={{ padding: '28px 32px', marginBottom: 28 }}>

      {/* ── Header: title + available balance ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 20,
      }}>
        <div>
          <h4 style={{ fontWeight: 800, fontSize: 16 }}>Session Wallet</h4>
          {/* ✅ FIX (Bug 4-C): removed misleading recentTransactions[0].amount */}
          <p style={{ fontSize: 12, color: 'var(--n-400)', marginTop: 2 }}>
            Pay-per-session · auto-deducted at booking
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontSize: 10, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--n-400)', marginBottom: 4,
          }}>
            Available Balance
          </p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 36,
            color: 'var(--forest)', fontWeight: 800,
          }}>
            {inr(wallet?.available ?? 0)}
          </p>
        </div>
      </div>

      {/* ── Transaction list ── */}
      <div style={{ marginBottom: 20 }}>
        {wallet?.recentTransactions?.slice(0, 5).map((t, i) => (
          <div
            key={t.transactionId ?? i}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', borderBottom: '1px solid var(--n-100)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: t.direction === 'Credit'
                  ? 'rgba(16,185,129,0.1)'
                  : 'rgba(239,68,68,0.08)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 14,
              }}>
                {t.direction === 'Credit' ? '↑' : '↓'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {t.description ?? t.transactionType}
                </div>
                <div style={{ fontSize: 11, color: 'var(--n-400)' }}>
                  {new Date(t.createdTime).toLocaleDateString([], {
                    weekday: 'short', month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
            {/* ✅ amount is always shown — format with sign and colour */}
            <span style={{
              fontWeight: 700, fontSize: 14,
              color: t.direction === 'Credit' ? 'var(--success)' : 'var(--danger)',
            }}>
              {t.direction === 'Credit' ? '+' : '-'}{inr(t.amount)}
            </span>
          </div>
        ))}

        {(!wallet?.recentTransactions || wallet.recentTransactions.length === 0) && (
          <p style={{
            fontSize: 13, color: 'var(--n-400)',
            textAlign: 'center', padding: '16px 0',
          }}>
            No transactions yet.
          </p>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn btn-outline"
          style={{ flex: 1 }}
          onClick={() => {
            setShowTopUp(!showTopUp)
            setSubmitError(null)
            setTopUpStep('idle')
          }}
        >
          {showTopUp ? 'Cancel' : '+ Add Funds'}
        </button>
        <button
          className="btn btn-forest"
          style={{ flex: 1 }}
          onClick={() => {}}
        >
          ⚡ Auto-Pay: Active
        </button>
      </div>

      {/* ── Top-up panel ── */}
      {showTopUp && (
        <div style={{
          marginTop: 24, borderTop: '1px solid var(--n-100)', paddingTop: 24,
        }}>
          {topUpStep === 'success' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--forest)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 24,
                margin: '0 auto 12px',
                color: 'white',
              }}>
                ✓
              </div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>
                {topUpAmount
                  ? `₹${Number(topUpAmount).toLocaleString('en-IN')} Added!`
                  : 'Funds Added!'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--n-400)', marginTop: 4 }}>
                Updating your balance…
              </p>
            </div>
          ) : (
            <>
              <style>{paymentCss}</style>

              {/* Amount input */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  fontSize: 12, fontWeight: 600,
                  color: 'var(--n-500)', display: 'block', marginBottom: 6,
                }}>
                  Top-up Amount (₹)
                </label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. 500"
                  min={1}
                  value={topUpAmount}
                  onChange={e => {
                    setTopUpAmount(e.target.value)
                    setSubmitError(null)
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Error — shown when backend call fails */}
              {submitError && (
                <p style={{
                  fontSize: 13, color: 'var(--danger)',
                  marginBottom: 12, fontWeight: 600,
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8, padding: '10px 14px',
                }}>
                  ⚠ {submitError}
                </p>
              )}

              {/* ModernPaymentUI — its onSuccess triggers the real API call */}
              <ModernPaymentUI
                amount={topUpAmount ? Number(topUpAmount) : 500}
                walletBalance={wallet?.available ?? 0}
                onSuccess={handlePaymentSuccess}
              />

              {isSubmitting && (
                <p style={{
                  textAlign: 'center', fontSize: 13,
                  color: 'var(--forest)', marginTop: 10, fontWeight: 600,
                }}>
                  ⏳ Saving payment to your wallet…
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default WalletCard
</file>

<file path="src/pages/patient/PatientPage.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/patient/PatientPage.tsx
// Root – only handles screen-level routing between Dashboard & Finder.
// All UI has been moved to sub-components under ./components/
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import DashboardView from './components/DashboardView'
import FinderFlow    from './components/FinderFlow'

type Screen = 'dashboard' | 'finder'

const PatientPage: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('dashboard')

  return screen === 'finder'
    ? <FinderFlow    onBack={() => setScreen('dashboard')} />
    : <DashboardView onFindNew={() => setScreen('finder')} />
}

export default PatientPage
</file>

<file path="src/pages/PatientIntakeForm.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/PatientIntakeForm.tsx  ── FIXED
//
// Bug fix:
//   The previous code did:
//     const responseData = (result as any).data || result
//     localStorage.setItem('patientId', responseData.id)
//
//   This is WRONG because apiClient.post() already unwraps
//   BackendResult<T>.data for you (see apiClient.ts line:
//     return (parsed?.data ?? parsed) as T
//   ).
//   So `result` IS the Patient_IntakeResponse directly, and
//   `result.data` is always undefined — causing patientId to be
//   stored as "undefined", breaking every subsequent dashboard load.
//
//   Fix: use result.id directly.
// ─────────────────────────────────────────────────────────────────

import React, { useState } from 'react'
import { patientService, type IntakeResponse } from '../services/patientService'
import type { ViewType } from '../App'

interface Props {
  setView: (view: ViewType) => void
}

export default function PatientIntakeForm({ setView }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [formData, setFormData]         = useState({ notes: '', score: 50 })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const userId = localStorage.getItem('userId')
    if (!userId) {
      alert('Session expired. Please log in again.')
      localStorage.setItem('cognantic_current_view', 'home')
      setView('home')
      return
    }

    if (!formData.notes.trim()) {
      setError("Please tell us what's on your mind before continuing.")
      return
    }

    setIsSubmitting(true)
    try {
      // POST /api/v1/Patients/intake
      // Patient_IntakeResponse = { id: Guid, mrNo: string, fullName: string, ... }
      // apiClient already unwraps BackendResult<T>.data, so `result`
      // is the Patient_IntakeResponse — NOT wrapped in another `.data`.
      const result: IntakeResponse = await patientService.submitIntake({
        userId,
        narrative:       formData.notes,
        resilienceScore: formData.score,
      })

      console.log('[Intake] Patient profile created:', result.mrNo, result.fullName)

      // ── BUG FIX: store result.id directly (not result.data.id) ──
      // patientId = PatientId in DB = same Guid as userId (shared PK).
      localStorage.setItem('patientId', result.id)

      // Drive App.tsx to the patient dashboard
      localStorage.setItem('cognantic_current_view', 'patient')
      setView('patient')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit intake. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="page animate-fade-up"
      style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}
    >
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 42, color: 'var(--charcoal)', marginBottom: 12,
      }}>
        Medical Intake
      </h2>
      <p style={{ color: 'var(--n-400)', fontSize: 14, marginBottom: 40 }}>
        Complete your clinical baseline to activate your personalised dashboard.
      </p>

      {error && (
        <div style={{
          padding: '14px 18px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid #EF4444',
          borderRadius: 14,
          color: '#B91C1C',
          fontSize: 13, fontWeight: 500,
          marginBottom: 24,
        }}>
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ padding: '36px', display: 'flex', flexDirection: 'column', gap: 24 }}
      >
        {/* Narrative */}
        <div className="form-group">
          <label className="label">Clinical Notes / Narrative</label>
          <textarea
            className="input"
            disabled={isSubmitting}
            style={{ height: 160, resize: 'none', padding: '16px' }}
            placeholder="Tell us what's on your mind? (e.g., workplace anxiety, stress, grief…)"
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            required
            maxLength={1000}
          />
          <span style={{
            fontSize: 10, color: 'var(--n-400)',
            textAlign: 'right', display: 'block', marginTop: 4,
          }}>
            {formData.notes.length}/1000
          </span>
        </div>

        {/* Resilience Slider */}
        <div className="form-group">
          <label
            className="label"
            style={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <span>Initial Resilience Baseline</span>
            <span style={{ color: 'var(--forest)', fontWeight: 800 }}>{formData.score}%</span>
          </label>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--n-50)', padding: '14px 20px', borderRadius: 16,
          }}>
            <input
              type="range"
              disabled={isSubmitting}
              min="0"
              max="100"
              value={formData.score}
              onChange={e => setFormData({ ...formData, score: parseInt(e.target.value, 10) })}
              style={{ flex: 1, accentColor: 'var(--forest)' }}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--n-400)', marginTop: 6 }}>
            Slide to reflect your current emotional resilience (0 = very low, 100 = very high).
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-forest btn-lg btn-full"
          style={{ marginTop: 12, borderRadius: 18 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving Profile…' : 'Finalise Onboarding →'}
        </button>
      </form>
    </div>
  )
}
</file>

<file path="src/pages/therapist/components/EarningsView.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/therapist/components/EarningsView.tsx
// Wallet / payout panel for the clinician.
// Extracted verbatim from TherapistPage – no logic changed.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react'
import { sessionService, type EarningsSummary } from '../../../services/sessionService'
import { walletService } from '../../../services/walletService'
import LoadingSpinner from '../../../components/LoadingSpinner'

interface EarningsViewProps {
  clinicianId: string
}

const EarningsView: React.FC<EarningsViewProps> = ({ clinicianId }) => {
  const [earnings,       setEarnings]       = useState<EarningsSummary | null>(null)
  const [withdrawals,    setWithdrawals]    = useState<any[]>([])
  const [isLoading,      setIsLoading]      = useState(true)
  const [showWithdraw,   setShowWithdraw]   = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [payoutMethod,   setPayoutMethod]   = useState('UPI')
  const [payoutDetails,  setPayoutDetails]  = useState('')
  const [withdrawing,    setWithdrawing]    = useState(false)

  useEffect(() => {
    Promise.all([
      sessionService.getEarnings(clinicianId),
      walletService.getWithdrawals(clinicianId).catch(() => []),
    ]).then(([e, w]) => { setEarnings(e); setWithdrawals(w); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [clinicianId])

  const handleWithdraw = async () => {
    if (!withdrawAmount || !payoutDetails) return
    setWithdrawing(true)
    try {
      await walletService.requestWithdrawal({
        clinicianId,
        amount: Number(withdrawAmount),
        payoutMethod,
        payoutDetails,
      })
      alert('Withdrawal request submitted for admin approval.')
      setShowWithdraw(false)
      setWithdrawAmount('')
      setPayoutDetails('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Withdrawal failed')
    } finally { setWithdrawing(false) }
  }

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <LoadingSpinner />
    </div>
  )

  return (
    <div>
      {/* Balance cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 28 }}>
        {[
          { label: 'Total Earned',     value: `₹${earnings?.balance?.toFixed(2) ?? '0.00'}`,       color: 'var(--forest)'  },
          { label: 'Pending Escrow',   value: `₹${earnings?.escrowBalance?.toFixed(2) ?? '0.00'}`, color: 'var(--warning)' },
          { label: 'Available Payout', value: `₹${earnings?.available?.toFixed(2) ?? '0.00'}`,     color: 'var(--forest)'  },
        ].map(k => (
          <div key={k.label} className="card" style={{ padding: '24px 20px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--n-400)', marginBottom: 10 }}>{k.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Withdraw button */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-forest" onClick={() => setShowWithdraw(!showWithdraw)}>
          Request Payout
        </button>
      </div>

      {showWithdraw && (
        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h4 style={{ fontWeight: 800, marginBottom: 16 }}>Request Withdrawal</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" min="1" placeholder="Amount"
                value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} />
            </div>
            <div>
              <label className="label">Method</label>
              <select className="input" value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}>
                <option value="UPI">UPI</option>
                <option value="BankTransfer">Bank Transfer</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label className="label">UPI ID / Account Number</label>
            <input className="input" placeholder="yourname@upi or account number"
              value={payoutDetails} onChange={e => setPayoutDetails(e.target.value)} />
          </div>
          <button className="btn btn-forest" disabled={withdrawing || !withdrawAmount || !payoutDetails} onClick={handleWithdraw}>
            {withdrawing ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      )}

      {/* Earnings history */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--n-100)' }}>
          <h4 style={{ fontWeight: 800, fontSize: 15 }}>Earnings History</h4>
        </div>
        {earnings?.transactions?.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--n-400)', fontSize: 14 }}>No earnings yet.</div>
        ) : (
          earnings?.transactions?.map((t, i) => (
            <div key={t.transactionId ?? i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 24px', borderBottom: '1px solid var(--n-50)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.description ?? t.transactionType}</div>
                <div style={{ fontSize: 11, color: 'var(--n-400)' }}>{new Date(t.createdTime).toLocaleDateString()}</div>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: 14 }}>+₹{t.amount.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--n-100)' }}>
            <h4 style={{ fontWeight: 800, fontSize: 15 }}>Withdrawal Requests</h4>
          </div>
          {withdrawals.map((w, i) => (
            <div key={w.withdrawalId ?? i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 24px', borderBottom: '1px solid var(--n-50)',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>₹{w.amount} via {w.payoutMethod}</div>
                <div style={{ fontSize: 11, color: 'var(--n-400)' }}>{new Date(w.createdTime).toLocaleDateString()}</div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
                background: w.status === 'Transferred' ? 'rgba(16,185,129,0.1)' : w.status === 'Rejected' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.1)',
                color: w.status === 'Transferred' ? 'var(--success)' : w.status === 'Rejected' ? 'var(--danger)' : 'var(--warning)',
              }}>
                {w.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EarningsView
</file>

<file path="src/pages/therapist/components/PatientList.tsx">
// ─────────────────────────────────────────────────────────────────
// src/pages/therapist/components/PatientList.tsx
// Assigned-patient list / pending requests tab.
// Extracted verbatim from TherapistPage – no logic changed.
// ─────────────────────────────────────────────────────────────────

import React from 'react'

const PatientList: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--n-400)' }}>
    <div style={{ fontSize: 40, marginBottom: 16 }}>📨</div>
    <p style={{ fontSize: 14 }}>
      Pending session requests will appear here.<br />
      <code style={{ fontSize: 11, background: 'var(--n-100)', padding: '2px 6px', borderRadius: 4, marginTop: 8, display: 'inline-block' }}>
        GET /api/v1/Clinicians/&#123;id&#125;/requests
      </code>
    </p>
  </div>
)

export default PatientList
</file>

<file path="src/pages/therapist/components/ScheduleManager.tsx">
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
</file>

<file path="src/pages/therapist/components/StatsOverview.tsx">
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
</file>

<file path="src/pages/therapist/TherapistPage.tsx">
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
</file>

<file path="src/services/adminService.ts">
// ─────────────────────────────────────────────────────────────────
// src/services/adminService.ts  ── UPDATED
//
// Added:
//   getWithdrawalRequests() — fixes WithdrawalsTab showing empty forever.
//   approveWithdrawal()    — moved here from walletService for consistency.
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient';

// ── Types ─────────────────────────────────────────────────────────

export interface AdminStats {
  totalPatients: number;
  totalClinicians: number;
  scheduledSessions: number;
  totalRevenue: number;
  averageResilienceScore: number;
  recentActivities: RecentActivity[];
  lastUpdated: string;
}

export interface RecentActivity {
  description: string;
  timestamp: string;
  type: string;
}

export interface VettingApplicant {
  clinicianId: string;
  fullName: string;
  email: string;
  specialty: string;
  vettingStatus: string;
  credential: string;
  createdTime: string;
  isActive: boolean;
}

export interface VettingActionRequest {
  clinicianId: string;
  action: 'Approve' | 'Reject';
  reason?: string;
}

export interface VettingActionResponse {
  clinicianId: string;
  newStatus: string;
  actionDate: string;
  adminNotes?: string;
}

export interface ManualOnboardRequest {
  fullName: string;
  email: string;
  specialty: string;
  languages?: string;
  credential: string;
  bio?: string;
  hourlyRate: number;
}

export interface ManualOnboardResponse {
  clinicianId: string;
  fullName: string;
  email: string;
  vettingStatus: string;
  createdTime: string;
  tempPassword?: string; // ✅ NEW — returned so Admin UI can display it
}

// ── NEW: Withdrawal request type (maps to WithdrawalRequest entity) ──
export interface WithdrawalRequestItem {
  withdrawalId: string;
  clinicianId: string;
  clinicianName: string;
  amount: number;
  payoutMethod: string;
  payoutDetails: string;
  status: string;            // "Pending" | "Approved" | "Rejected" | "Transferred"
  adminNotes: string | null;
  processedAt: string | null;
  gatewayReference: string | null;
  createdTime: string;
}

// ── Service ───────────────────────────────────────────────────────

export const adminService = {

  getStats: (): Promise<AdminStats> =>
    apiClient.get<AdminStats>('/Admin/stats'),

  getVettingList: (status?: string): Promise<VettingApplicant[]> => {
    const query = status ? `?status=${status}` : '';
    return apiClient.get<VettingApplicant[]>(`/Admin/vetting-list${query}`);
  },

  processVettingAction: (body: VettingActionRequest): Promise<VettingActionResponse> =>
    apiClient.post<VettingActionResponse>('/Admin/vetting-action', body),

  manualOnboard: (body: ManualOnboardRequest): Promise<ManualOnboardResponse> =>
    apiClient.post<ManualOnboardResponse>('/Admin/manual-onboard', body),

  // ── NEW: Fetch pending withdrawal requests for the Admin Payouts tab ──
  // Endpoint: GET /api/v1/Admin/withdrawal-requests?status=Pending
  // Fixes WithdrawalsTab which was calling setIsLoading(false) without
  // ever fetching any data — so it always showed "No pending requests".
  getWithdrawalRequests: (status = 'Pending'): Promise<WithdrawalRequestItem[]> =>
    apiClient.get<WithdrawalRequestItem[]>(`/Admin/withdrawal-requests?status=${status}`),

  // ── NEW: Approve or reject a withdrawal request ──────────────────
  // Endpoint: POST /api/v1/Wallet/admin/approve-withdrawal
  // Moved here from walletService for better separation (admin action).
  approveWithdrawal: (body: {
    withdrawalId: string;
    approved: boolean;
    adminNotes?: string;
  }): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>('/Wallet/admin/approve-withdrawal', body),
};
</file>

<file path="src/services/api.ts">
// src/services/api.ts
// Go UP one folder (out of services), and DOWN into the api folder!
import apiClient from '../api/apiClient';
import type {
  LoginRequest, RegisterRequest, AuthResponse, Patient, Therapist, MatchResult,
  BookingRequest, Session, AdminStats, VettingApplicant, AuditLog, RevenueDataPoint,
  PaginatedResponse, IntakeProfile
} from '../types';

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<AuthResponse>('/Auth/login', body),
  register: (body: RegisterRequest) => apiClient.post<AuthResponse>('/Auth/register', body),
  forgotPassword: (email: string) => apiClient.post<{ message: string }>('/Auth/forgot-password', { email }),
  resetPassword: (body: { email: string; NewPassword: string }) => apiClient.post<{ message: string }>('/Auth/reset-password', body),
  logout: () => apiClient.post<void>('/Auth/logout'),
};

export const patientApi = {
  getProfile: (id: string) => apiClient.get<Patient>(`/patients/${id}`),
  updateProfile: (id: string, body: Partial<Patient>) => apiClient.patch<Patient>(`/patients/${id}`, body),
  submitIntake: (id: string, intake: IntakeProfile) => apiClient.post<MatchResult[]>(`/patients/${id}/intake`, intake),
  getMatches: (id: string) => apiClient.get<MatchResult[]>(`/patients/${id}/matches`),
  getSessions: (id: string) => apiClient.get<PaginatedResponse<Session>>(`/patients/${id}/sessions`),
  bookSession: (body: BookingRequest) => apiClient.post<Session>('/sessions', body),
  cancelSession: (sessionId: string) => apiClient.post<Session>(`/sessions/${sessionId}/cancel`),
};

export const therapistApi = {
  getProfile: (id: string) => apiClient.get<Therapist>(`/therapists/${id}`),
  updateProfile: (id: string, body: Partial<Therapist>) => apiClient.patch<Therapist>(`/therapists/${id}`, body),
  getSchedule: (id: string, weekStart: string) => apiClient.get<Session[]>(`/therapists/${id}/schedule?weekStart=${weekStart}`),
  approveRequest: (sessionId: string) => apiClient.post<Session>(`/sessions/${sessionId}/approve`),
};

// Expose them cleanly to views!
export default {
  auth: authApi,
  patient: patientApi,
  therapist: therapistApi,
};
</file>

<file path="src/services/authService.ts">
// ─────────────────────────────────────────────────────────────────
// Cognantic – Auth Service
// Wires AuthModal & useAuth to the .NET AuthController
// ─────────────────────────────────────────────────────────────────

import { apiClient, setToken, clearToken } from '../api/apiClient'

// ── Response Types (matches C# Auth_LoginResponse / Auth_RegisterResponse) ──
export interface UserProfile {
  id: string           // Guid
  name: string         // FullName
  email: string
  role: 'patient' | 'therapist' | 'admin'
  avatarUrl?: string | null
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: UserProfile
  // 🟢 Added to match backend wiring
  patientId?: string | null
  clinicianId?: string | null
}

// ── Request Types ─────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  role: 'patient' | 'therapist'
  // ✅ FIX: Optional Supabase Auth UID.
  // When provided, the backend sets Users.Id = externalId so the row's
  // primary key matches the Supabase auth sub-claim.
  // Without this, the backend generates Guid.NewGuid() and wallet/profile
  // lookups that use the Supabase UID will always return "User not found".
  externalId?: string | null
}

// ── Auth API ──────────────────────────────────────────────────────
export const authService = {
  /**
   * POST /api/v1/Auth/login
   * Verifies credentials, returns JWT + UserProfile.
   * Automatically stores the token in memory + localStorage.
   */
  login: async (body: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/Auth/login', body)
    setToken(res.token)
    return res
  },

  /**
   * POST /api/v1/Auth/register
   * Creates a new User row (patient or therapist role).
   * Pass externalId = Supabase user UID when using Supabase Auth so that
   * Users.Id in the database matches the auth sub-claim stored in the JWT.
   * Does NOT create a Patient or Clinician profile — that happens in intake.
   */
  register: async (body: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/Auth/register', body)
    setToken(res.token)
    return res
  },

  /**
   * POST /api/v1/Auth/forgot-password
   * Sends a recovery email. Always returns 200 (security by design).
   */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post<void>('/Auth/forgot-password', { email })
  },

  /**
   * POST /api/v1/Auth/reset-password
   * Resets the password using the email from the recovery link.
   */
  resetPassword: async (email: string, newPassword: string): Promise<void> => {
    await apiClient.post<void>('/Auth/reset-password', { email, newPassword })
  },

  /**
   * Client-side logout. No server call needed (no JWT blacklist yet).
   */
  logout: () => {
    clearToken()
    localStorage.removeItem('cognantic_user')
    localStorage.removeItem('userId')
    localStorage.removeItem('cognantic_current_view')
  },
}
</file>

<file path="src/services/clinicianService.ts">
import { apiClient } from '../api/apiClient';

// ── Types ─────────────────────────────────────────────────────────

export interface MatchResult {
  clinicianId: string;
  fullName: string;
  specialty: string;
  languages?: string | null;
  matchScore: number;
  isAvailable: boolean;
  hourlyRate: number;
  // ✅ ADDED: returned by updated Clinician_MatchesResponse
  bio?: string | null;
  credential?: string | null;
  photoUrl?:    string | null
}

export interface AvailableSlot {
  slotId: string;
  clinicianId: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  isBooked: boolean;
}

export interface PlannedSession {
  sessionId: string;
  patientName: string;
  mrNo: string;
  startTime: string;
  sessionType: string;
  status: string;
  meetLink?:   string | null;
}

export interface PlannerResponse {
  clinicianId: string;
  clinicianName: string;
  dailySessions: PlannedSession[];
  totalMinutesBooked: number;
  dayRating?: number;
}

export interface SearchResult {
  clinicianId: string;
  fullName: string;
  specialty: string;
  languages?: string | null;
  credential?: string | null;
  bio?: string | null;
  hourlyRate: number;
  rating: number;
}

/**
 * Matches Clinician_GetProfileResponse from the backend.
 * Includes rejectionReason for the therapist dashboard banner.
 */
export interface ClinicianProfile {
  clinicianId: string;
  fullName: string;
  email: string;
  specialty: string;
  languages?: string | null;
  credential?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  vettingStatus: string;           // "Pending" | "Verified" | "Rejected"
  rejectionReason?: string | null; // Admin-provided reason for rejection
  isActive: boolean;
  createdTime: string;
}

// ── API Service ───────────────────────────────────────────────────

export const clinicianService = {
  /**
   * GET /api/v1/Clinicians/matches/{patientId}
   * Returns ranked clinician matches based on patient intake data.
   */
  getMatches: (
    patientId: string,
    opts?: { specialty?: string; language?: string }
  ): Promise<MatchResult[]> => {
    const p = new URLSearchParams();
    if (opts?.specialty) p.set('specialty', opts.specialty);
    if (opts?.language) p.set('language', opts.language);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return apiClient.get<MatchResult[]>(`/Clinicians/matches/${patientId}${qs}`);
  },

  /**
   * GET /api/v1/Clinicians/{id}/available-slots
   * Returns open booking slots for a specific clinician within a date range.
   */
  getAvailableSlots: (id: string, start: string, end: string): Promise<AvailableSlot[]> =>
    apiClient.get<AvailableSlot[]>(`/Clinicians/${id}/available-slots?start=${start}&end=${end}`),

  /**
   * GET /api/v1/Clinicians/{id}/planner
   * Returns the therapist's daily session planner and booking summary.
   */
  getPlanner: (id: string, date?: string): Promise<PlannerResponse> => {
    const qs = date ? `?date=${date}` : '';
    return apiClient.get<PlannerResponse>(`/Clinicians/${id}/planner${qs}`);
  },

  /**
   * GET /api/v1/Clinicians/search
   * Public-facing search for verified clinicians.
   */
  search: (opts?: {
    specialty?: string;
    maxHourlyRate?: number;
    searchTerm?: string;
  }): Promise<SearchResult[]> => {
    const p = new URLSearchParams();
    if (opts?.specialty) p.set('specialty', opts.specialty);
    if (opts?.maxHourlyRate) p.set('maxHourlyRate', String(opts.maxHourlyRate));
    if (opts?.searchTerm) p.set('searchTerm', opts.searchTerm);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return apiClient.get<SearchResult[]>(`/Clinicians/search${qs}`);
  },

  /**
   * POST /api/v1/Clinicians
   * Submits clinician onboarding data. Sets status to "Pending".
   */
  createProfile: (body: {
    userId: string;
    fullName: string;
    email: string;
    specialty: string;
    languages?: string;
    credential?: string;
    bio?: string;
    hourlyRate: number;
  }) => apiClient.post('/Clinicians', body),

  /**
   * GET /api/v1/Clinicians/profile/{userId}
   * Fetches profile state to restore session data (clinicianId, vettingStatus).
   * Essential for handling page refreshes or returning users.
   */
  getProfile: (userId: string): Promise<ClinicianProfile> =>
    apiClient.get<ClinicianProfile>(`/Clinicians/profile/${userId}`),
};
</file>

<file path="src/services/patientService.ts">
// ─────────────────────────────────────────────────────────────────
// Cognantic – Patient Service
// Wires PatientIntakeForm and PatientPage Dashboard to the backend
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient'

// ── Intake Types (matches Patient_IntakeRequest / Patient_IntakeResponse) ──
export interface IntakeRequest {
  userId: string        // GUID from Users table — stored after login/register
  narrative: string     // Required clinical notes (min 1 char, max 1000)
  resilienceScore: number  // 0–100 integer
}

export interface IntakeResponse {
  id: string            // PatientId (same as UserId)
  mrNo: string          // Auto-generated, e.g. "MRN-482910"
  fullName: string      // From linked User record
  status: string        // "Active"
  createdAt: string     // ISO datetime
}

// ── Dashboard Types (matches Patient_DashboardResponse) ────────────
export interface MatchedClinician {
  clinicianId: string
  fullName: string
  specialty: string
  matchStatus: string
}

export interface DashboardResponse {
  patientId: string
  fullName: string
  mrNo: string
  resilienceScore: number
  activeMatches: MatchedClinician[]
  totalSessions: number
}
// ... existing imports and types

export interface PatientProfile {
  patientId: string;
  mrNo: string;
  fullName: string;
  resilienceScore: number;
  createdAt: string;
}

export const patientService = {
  submitIntake: (body: IntakeRequest): Promise<IntakeResponse> =>
    apiClient.post<IntakeResponse>('/Patients/intake', body),

  getDashboard: (patientId: string): Promise<DashboardResponse> =>
    apiClient.get<DashboardResponse>(`/Patients/dashboard/${patientId}`),

  /**
   * GET /api/v1/Patients/profile/{userId}
   * NEW — Used to check if a returning user already has a patient record.
   */
  getProfile: (userId: string): Promise<PatientProfile> =>
    apiClient.get<PatientProfile>(`/Patients/profile/${userId}`),
}
</file>

<file path="src/services/sessionService.ts">
// ─────────────────────────────────────────────────────────────────
// src/services/sessionService.ts  ── UPDATED
//
// Changes from previous version:
//   1. Added startSession(sessionId, clinicianId)
//   2. Added endSession(sessionId, clinicianId) → returns overtime info
//   3. Added getEarnings(clinicianId) → clinician earnings summary
//   4. SessionEndResult type added
// All existing exports (BookingRequest, BookingResponse,
// UpcomingSession, book, getUpcoming, updateMeetLink) are unchanged.
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient'

// ── Booking ───────────────────────────────────────────────────────

export interface BookingRequest {
  patientId:    string
  clinicianId:  string
  sessionDate:  string
  sessionType?: string
  amount:       number
  notes?:       string
  meetLink?:    string
}

export interface BookingResponse {
  sessionId:          string
  patientId:          string
  clinicianId:        string
  status:             string
  scheduledAt:        string
  meetLink?:          string | null
  confirmationCode?:  string | null
  clinicianName:      string
}

// ── Upcoming Sessions (Patient Dashboard) ─────────────────────────

export interface UpcomingSession {
  sessionId:          string
  sessionDate:        string
  sessionType:        string
  status:             string
  meetLink?:          string | null
  confirmationCode?:  string | null
  clinicianName:      string
  amount:             number
}

// ── Session End / Overtime ── NEW ─────────────────────────────────

export interface SessionEndResult {
  sessionId:       string
  overtimeMinutes: number
  overtimeCharged: number
  baseAmount:      number
  totalCharged:    number
  message:         string
}

// ── Clinician Earnings ── NEW ─────────────────────────────────────

export interface EarningTransaction {
  transactionId:   string
  transactionType: string
  amount:          number
  description:     string | null
  createdTime:     string
}

export interface EarningsSummary {
  balance:       number
  escrowBalance: number
  available:     number
  transactions:  EarningTransaction[]
}

// ── Service ───────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7208/api/v1'

export const sessionService = {

  /**
   * POST /api/v1/Sessions/book
   * Creates a Session + holds patient wallet escrow.
   */
  book: (body: BookingRequest): Promise<BookingResponse> =>
    apiClient.post<BookingResponse>('/Sessions/book', body),

  /**
   * GET /api/v1/Sessions/upcoming/{patientId}
   * Returns scheduled future sessions for the patient dashboard.
   */
  getUpcoming: (patientId: string): Promise<UpcomingSession[]> =>
    apiClient.get<UpcomingSession[]>(`/Sessions/upcoming/${patientId}`),

  /**
   * PATCH /api/v1/Sessions/{sessionId}/meet-link
   * Clinician updates the Zoom/Meet URL after booking.
   */
  updateMeetLink: (sessionId: string, meetLink: string): Promise<void> =>
    apiClient.patch<void>(`/Sessions/${sessionId}/meet-link`, { meetLink }),

  /**
   * POST /api/v1/Sessions/{sessionId}/start
   * Clinician clicks "Start Session" — records ActualStartTime.
   */
  startSession: (sessionId: string, clinicianId: string): Promise<void> =>
    apiClient.post<void>(`/Sessions/${sessionId}/start`, { clinicianId }),

  /**
   * POST /api/v1/Sessions/{sessionId}/end
   * Clinician clicks "End Session":
   *   • Records ActualEndTime
   *   • Computes overtime (every 5 min beyond 60 min)
   *   • Auto-debits patient wallet for overtime
   *   • Credits clinician wallet (base + overtime, minus platform cut)
   */
  endSession: (sessionId: string, clinicianId: string): Promise<SessionEndResult> =>
    apiClient.post<SessionEndResult>(`/Sessions/${sessionId}/end`, { clinicianId }),

  /**
   * GET /api/v1/Sessions/earnings/{clinicianId}
   * Returns the clinician's earnings balance and credit history.
   */
  getEarnings: (clinicianId: string): Promise<EarningsSummary> =>
    apiClient.get<EarningsSummary>(`/Sessions/earnings/${clinicianId}`),

  /**
   * POST extend session (direct fetch)
   */
  extendSession: (sessionId: string, body: unknown): Promise<unknown> =>
    fetch(`${API_URL}/Sessions/${sessionId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()),
}
</file>

<file path="src/services/videoService.ts">
// ─────────────────────────────────────────────────────────────────
// src/services/videoService.ts
//
// In-platform video conferencing using Jitsi Meet (free, open-source,
// no API key required, embeds fully inside an iframe).
//
// HOW IT WORKS:
//   - A deterministic room URL is generated from the sessionId.
//   - Both the patient and clinician derive the SAME URL independently
//     — no link sharing or backend change needed.
//   - The call renders inside an <iframe> inside the platform.
//   - Users never leave Cognantic.
// ─────────────────────────────────────────────────────────────────

// Public Jitsi server — free, no account/key needed.
// For production you can self-host: https://jitsi.github.io/handbook/docs/devops-guide/
const JITSI_DOMAIN = 'meet.jit.si'

export const videoService = {
  /**
   * Generates a deterministic Jitsi Meet room URL from a sessionId.
   *
   * Both patient and clinician call this with the same sessionId
   * and land in the same room — automatically.
   *
   * Config flags embedded in the URL hash:
   *   - prejoinPageEnabled=false  → skip the "are you ready?" lobby screen
   *   - startWithAudioMuted=false → mic ON by default
   *   - startWithVideoMuted=false → camera ON by default
   *   - disableDeepLinking=true   → prevent Jitsi from pushing users to the mobile app
   */
  getRoomUrl: (sessionId: string): string => {
    // Prefix makes rooms unguessable from outside the platform
    const roomName = `cognantic-${sessionId}`
    const config = [
      'config.prejoinPageEnabled=false',
      'config.startWithAudioMuted=false',
      'config.startWithVideoMuted=false',
      'config.disableDeepLinking=true',
      'config.toolbarButtons=["microphone","camera","chat","fullscreen","hangup"]',
    ].join('&')
    return `https://${JITSI_DOMAIN}/${roomName}#${config}`
  },
}
</file>

<file path="src/services/walletService.ts">
// ─────────────────────────────────────────────────────────────────
// src/services/walletService.ts  ── NEW
//
// Wires the patient and clinician wallet UI to the backend.
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient'

// ── Types ─────────────────────────────────────────────────────────

export interface WalletTransaction {
  transactionId:   string
  transactionType: string   // "TopUp" | "BookingHold" | "OvertimeDebit" | "SessionPayout" | "Withdrawal"
  direction:       string   // "Debit" | "Credit"
  amount:          number
  balanceAfter:    number
  description:     string | null
  createdTime:     string   // ISO
}

export interface WalletBalance {
  walletId?:            string
  balance:              number
  escrowBalance:        number
  available:            number
  recentTransactions:   WalletTransaction[]
}

export interface TopUpResponse {
  walletId:      string
  newBalance:    number
  transactionId: string
}

export interface WithdrawResponse {
  withdrawalId: string
  amount:       number
  status:       string
  message:      string
}

export interface WithdrawalRequest {
  withdrawalId:     string
  amount:           number
  payoutMethod:     string
  payoutDetails:    string
  status:           string   // "Pending" | "Approved" | "Rejected" | "Transferred"
  adminNotes:       string | null
  processedAt:      string | null
  gatewayReference: string | null
  createdTime:      string
}

// ── Service ───────────────────────────────────────────────────────

export const walletService = {

  /**
   * GET /api/v1/Wallet/balance/{userId}
   * Returns current balance, escrow, and last 20 transactions.
   */
  getBalance: (userId: string): Promise<WalletBalance> =>
    apiClient.get<WalletBalance>(`/Wallet/balance/${userId}`),

  /**
   * POST /api/v1/Wallet/topup
   * Patient adds money to their wallet.
   * gatewayReference comes from the Razorpay success callback.
   */
  topUp: (body: {
    userId:            string
    amount:            number
    paymentMethod:     string
    gatewayReference?: string
  }): Promise<TopUpResponse> =>
    apiClient.post<TopUpResponse>('/Wallet/topup', body),

  /**
   * POST /api/v1/Wallet/withdraw
   * Clinician requests a payout. Admin must approve.
   */
  requestWithdrawal: (body: {
    clinicianId:  string
    amount:       number
    payoutMethod: string
    payoutDetails: string   // UPI ID or bank account number
  }): Promise<WithdrawResponse> =>
    apiClient.post<WithdrawResponse>('/Wallet/withdraw', body),

  /**
   * GET /api/v1/Wallet/withdrawals/{clinicianId}
   * Lists all withdrawal requests for a clinician.
   */
  getWithdrawals: (clinicianId: string): Promise<WithdrawalRequest[]> =>
    apiClient.get<WithdrawalRequest[]>(`/Wallet/withdrawals/${clinicianId}`),

  /**
   * POST /api/v1/Wallet/admin/approve-withdrawal
   * Admin-only: approve or reject a withdrawal.
   */
  adminApproveWithdrawal: (body: {
    withdrawalId:      string
    approved:          boolean
    adminNotes?:       string
    approvedBy?:       string
    gatewayReference?: string
  }): Promise<void> =>
    apiClient.post<void>('/Wallet/admin/approve-withdrawal', body),
}
</file>

<file path="src/styles/global.css">
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap');

/* ───────────────────────────── DESIGN TOKENS */
:root {
  /* Brand */
  --sage:        #9AA57B;
  --sage-light:  #D6EEF0;
  --forest:      #39786A;
  --forest-dark: #2a5f54;
  --cream:       #DFD8BE;
  --cream-bg:    #F7F6F2;
  --white:       #FFFFFF;
  --charcoal:    #1C1C1E;

  /* Neutrals */
  --n-50:  #F8FAFC;
  --n-100: #F1F5F9;
  --n-200: #E2E8F0;
  --n-300: #CBD5E1;
  --n-400: #94A3B8;
  --n-500: #64748B;
  --n-600: #475569;
  --n-700: #334155;
  --n-900: #0F172A;

  /* Semantic */
  --success: #10B981;
  --warning: #F59E0B;
  --danger:  #EF4444;
  --info:    #3B82F6;
  --purple:  #8B5CF6;

  /* Typography */
  --font-sans:    'Sora', sans-serif;
  --font-display: 'DM Serif Display', serif;

  /* Radii */
  --r-sm:  10px;
  --r-md:  18px;
  --r-lg:  28px;
  --r-xl:  40px;
  --r-full: 9999px;

  /* Shadows */
  --shadow-sm:  0 1px 4px rgba(28,28,30,0.06);
  --shadow-md:  0 4px 16px rgba(28,28,30,0.08);
  --shadow-lg:  0 12px 40px rgba(28,28,30,0.12);
  --shadow-forest: 0 8px 24px -4px rgba(57,120,106,0.35);
}

/* ───────────────────────────── RESET */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }

body {
  font-family: var(--font-sans);
  background-color: var(--cream-bg);
  color: var(--charcoal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.5;
}

/* ───────────────────────────── LAYOUT */
.app-root { min-height: 100vh; }

.content-viewport {
  padding-top: 80px;
  min-height: 100vh;
  animation: fadeUp 0.35s ease;
}

.page {
  max-width: 1280px;
  margin: 0 auto;
  padding: 52px 44px 96px;
}

@media (max-width: 1024px) { .page { padding: 40px 28px 80px; } }
@media (max-width: 640px)  { .page { padding: 28px 16px 60px; } }

/* ───────────────────────────── ANIMATIONS */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes pulseDot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}

.animate-fade-up     { animation: fadeUp 0.35s ease both; }
.animate-fade-in     { animation: fadeIn 0.25s ease both; }
.animate-scale-in    { animation: scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both; }
.animate-slide-right { animation: slideInRight 0.35s cubic-bezier(0.16,1,0.3,1) both; }
.pulse               { animation: pulseDot 2s ease infinite; }

/* ───────────────────────────── GLASS HEADER */
.glass-header {
  background: rgba(247, 246, 242, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(154, 165, 123, 0.18);
}

/* ───────────────────────────── CARD */
.card {
  background: var(--white);
  border: 1px solid var(--n-200);
  border-radius: var(--r-lg);
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1),
              box-shadow 0.3s cubic-bezier(0.4,0,0.2,1),
              border-color 0.3s ease;
}
.card.hoverable:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  border-color: var(--sage);
}

/* ───────────────────────────── BUTTONS */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: var(--r-md);
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  padding: 13px 28px;
}
.btn:disabled { opacity: 0.35; cursor: not-allowed; pointer-events: none; }

.btn-primary {
  background: var(--charcoal);
  color: var(--white);
}
.btn-primary:hover {
  background: var(--forest);
  transform: translateY(-1px);
  box-shadow: var(--shadow-forest);
}

.btn-forest {
  background: var(--forest);
  color: var(--white);
}
.btn-forest:hover {
  background: var(--forest-dark);
  transform: translateY(-1px);
  box-shadow: var(--shadow-forest);
}

.btn-outline {
  background: transparent;
  color: var(--n-600);
  border: 1.5px solid var(--n-200);
}
.btn-outline:hover {
  border-color: var(--sage);
  color: var(--forest);
  background: rgba(154,165,123,0.06);
}

.btn-ghost {
  background: transparent;
  color: var(--n-400);
  padding: 10px 16px;
}
.btn-ghost:hover { color: var(--charcoal); }

.btn-danger {
  background: var(--danger);
  color: var(--white);
}
.btn-danger:hover { background: #dc2626; transform: translateY(-1px); }

.btn-lg { padding: 18px 44px; font-size: 12px; border-radius: 24px; }
.btn-sm { padding: 9px 18px; font-size: 10px; border-radius: 12px; }
.btn-full { width: 100%; }

/* ───────────────────────────── FORM */
.input {
  width: 100%;
  padding: 15px 20px;
  border-radius: var(--r-md);
  background: var(--n-50);
  border: 1.5px solid var(--n-100);
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--charcoal);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  appearance: none;
}
.input:focus {
  border-color: var(--forest);
  box-shadow: 0 0 0 4px rgba(57,120,106,0.1);
  background: var(--white);
}
.input::placeholder { color: var(--n-400); font-weight: 400; }

.label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--n-400);
  margin-bottom: 8px;
}

.form-group { display: flex; flex-direction: column; gap: 6px; }

/* ───────────────────────────── OVERLAY */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(28, 28, 30, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 24px;
  animation: fadeIn 0.2s ease;
}

/* ───────────────────────────── TABS */
.tab-nav {
  display: flex;
  align-items: center;
  border-bottom: 1.5px solid var(--n-200);
  margin-bottom: 40px;
  overflow-x: auto;
}
.tab-nav::-webkit-scrollbar { display: none; }

.tab-btn {
  flex-shrink: 0;
  padding: 0 0 18px 0;
  margin-right: 36px;
  background: none;
  border: none;
  border-bottom: 2.5px solid transparent;
  margin-bottom: -1.5px;
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 700;
  color: var(--n-400);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.tab-btn:hover { color: var(--charcoal); }
.tab-btn.active { color: var(--forest); border-bottom-color: var(--forest); }

/* ───────────────────────────── BADGES */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.badge-forest  { background: rgba(57,120,106,0.12); color: var(--forest); }
.badge-sage    { background: rgba(154,165,123,0.18); color: #6b7a55; }
.badge-amber   { background: rgba(245,158,11,0.12);  color: #92400e; }
.badge-red     { background: rgba(239,68,68,0.1);    color: #b91c1c; }
.badge-blue    { background: rgba(59,130,246,0.1);   color: #1d4ed8; }
.badge-purple  { background: rgba(139,92,246,0.1);   color: #6d28d9; }
.badge-live    { background: rgba(16,185,129,0.12);  color: #065f46; }

/* ───────────────────────────── DATA TABLE */
.data-table { width: 100%; border-collapse: collapse; }
.data-table thead tr { background: var(--n-50); }
.data-table th {
  padding: 14px 28px;
  text-align: left;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--n-400);
}
.data-table tbody tr { border-top: 1px solid var(--n-100); transition: background 0.15s; }
.data-table tbody tr:hover { background: rgba(154,165,123,0.04); }
.data-table td { padding: 24px 28px; vertical-align: middle; }

/* ───────────────────────────── PROGRESS */
.progress-bar { height: 6px; background: var(--n-100); border-radius: var(--r-full); overflow: hidden; }
.progress-fill { height: 100%; background: var(--forest); border-radius: var(--r-full); transition: width 0.7s cubic-bezier(0.4,0,0.2,1); }

/* ───────────────────────────── SLOT BUTTON */
.slot-btn {
  padding: 18px 12px;
  border-radius: 20px;
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 14px;
  border: 2px solid var(--n-100);
  background: var(--n-50);
  color: var(--n-600);
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.slot-btn:hover  { border-color: var(--forest); color: var(--forest); background: rgba(57,120,106,0.04); }
.slot-btn.active { border-color: var(--forest); background: var(--forest); color: white; box-shadow: 0 6px 18px -4px rgba(57,120,106,0.45); }

/* ───────────────────────────── DAY PILL */
.day-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid var(--n-200);
  background: var(--white);
  min-width: 72px;
}
.day-pill:hover  { border-color: var(--sage); }
.day-pill.active { background: var(--forest); border-color: var(--forest); }

/* ───────────────────────────── STAT CARD ACCENTS */
.accent-forest { border-left: 4px solid var(--forest) !important; }
.accent-sage   { border-left: 4px solid var(--sage) !important; }
.accent-warning{ border-left: 4px solid var(--warning) !important; }
.accent-success{ border-left: 4px solid var(--success) !important; }
.accent-purple { border-left: 4px solid var(--purple) !important; }
.card-dark     { background: var(--charcoal) !important; border-color: var(--charcoal) !important; }

/* ───────────────────────────── SCROLLBAR HIDE */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }

/* ───────────────────────────── DIVIDER */
.divider { height: 1px; background: var(--n-100); margin: 0; }

/* ───────────────────────────── MONO LOG */
.log-line {
  display: flex;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--n-50);
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--n-500);
  align-items: flex-start;
}
.log-time { min-width: 148px; color: var(--n-400); }
.log-type { min-width: 48px; font-weight: 800; }
</file>

<file path="src/types/index.ts">
// ─────────────────────────────────────────────────────────────────
// Cognantic – Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────

export type ViewType = 'home' | 'patient' | 'therapist' | 'admin'
export type AuthRole = 'patient' | 'therapist'
export type AuthMode = 'login' | 'register' | 'forgot'

// ── Auth ──────────────────────────────────────────────────────────
export interface LoginRequest {
  email:    string
  password: string
  role:     AuthRole
}

export interface RegisterRequest {
  fullName: string
  email:    string
  password: string
  role:     AuthRole
}

export interface AuthResponse {
  token:   string
  user:    User
  message: string
}

// ── User ─────────────────────────────────────────────────────────
export interface User {
  id:        string
  name:      string
  email:     string
  role:      AuthRole
  createdAt: string
}

// ── Patient ──────────────────────────────────────────────────────
export interface Patient extends User {
  role:            'patient'
  resilienceScore: number
  currentTherapist?: TherapistSummary
  sessions:         Session[]
  intakeProfile?:   IntakeProfile
}

export interface IntakeProfile {
  ageGroup:    string
  language:    string
  location:    string
  sessionMode: 'video' | 'voice' | 'chat'
  narrative:   string
}

// ── Therapist ─────────────────────────────────────────────────────
export interface Therapist extends User {
  role:          'therapist'
  specialization: string
  credentials:   string
  experience:    number       // years
  rating:        number       // 0-5
  totalSessions: number
  hourlyRate:    number       // USD
  availability:  AvailabilitySlot[]
  status:        'active' | 'pending' | 'suspended'
  matchScore?:   number       // 0-100, returned in match context
  languages: string[]; // 👈 Added: Array of languages spoken (e.g., ['English', 'Malayalam'])
}

export interface TherapistSummary {
  id:             string
  name:           string
  specialization: string
  rating:         number
  hourlyRate:     number
  languages: string[]; // 👈 Added here as well for cards/summaries
}

export interface AvailabilitySlot {
  date:      string           // ISO date string
  timeSlots: string[]         // ['09:00', '11:30', …]
  blocked:   boolean
  blockNote?: string
}

// ── Booking / Session ─────────────────────────────────────────────
export interface BookingRequest {
  patientId:    string
  therapistId:  string
  date:         string
  timeSlot:     string
  sessionMode:  'video' | 'voice' | 'chat'
}

export interface Session {
  id:           string
  patientId:    string
  therapistId:  string
  date:         string
  timeSlot:     string
  status:       'scheduled' | 'completed' | 'cancelled' | 'pending'
  sessionType:  string        // e.g. 'CBT Session', 'Initial Audit'
  notes?:       string
  amount:       number
}

// ── Matching ──────────────────────────────────────────────────────
export interface MatchResult {
  therapist:   Therapist
  matchScore:  number         // 0-100
  matchReasons: string[]
}

// ── Admin ─────────────────────────────────────────────────────────
export interface VettingApplicant {
  id:             number
  name:           string
  email:          string
  specialization: string
  credential:     string
  appliedAt:      string
  licenseUrl:     string
  status:         'pending' | 'approved' | 'declined'
}

export interface AdminStats {
  totalPatients:     number
  activeTherapists:  number
  platformBalance:   number
  avgRetention:      number
  pendingVetting:    number
}

export interface AuditLog {
  id:        string
  timestamp: string
  type:      'AUTH' | 'PAY' | 'VET' | 'SYS' | 'ALERT'
  message:   string
  ipAddress?: string
}

export interface RevenueDataPoint {
  month:       string
  gross:       number
  payout:      number
  platformNet: number
}

// ── API Response wrapper ──────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data:    T
  message?: string
  error?:  string
}

export interface PaginatedResponse<T> {
  items:      T[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}
</file>

<file path="src/vite-env.d.ts">
/// <reference types="vite/client" />
</file>

</files>
