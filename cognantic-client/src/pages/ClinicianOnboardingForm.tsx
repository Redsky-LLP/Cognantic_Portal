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