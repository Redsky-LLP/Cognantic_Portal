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