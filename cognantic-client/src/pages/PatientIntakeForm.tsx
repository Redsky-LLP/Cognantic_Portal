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