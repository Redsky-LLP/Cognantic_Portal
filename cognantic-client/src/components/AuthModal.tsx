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