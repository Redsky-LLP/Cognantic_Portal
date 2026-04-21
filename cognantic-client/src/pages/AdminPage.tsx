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
//  5. ADDED: Photo upload for manual onboarding - admin can upload clinician profile photo.
// ─────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react'
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
  photoFile: File | null; photoPreview: string
}

const ManualOnboardTab: React.FC = () => {
  const [form, setForm] = useState<OnboardForm>({ 
    fullName: '', email: '', specialty: '', languages: '', credential: '', bio: '', hourlyRate: '',
    photoFile: null, photoPreview: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [result,  setResult]  = useState<{ name: string; tempPassword: string; clinicianId: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const set = (field: keyof Omit<OnboardForm, 'photoFile' | 'photoPreview'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setForm(prev => ({
        ...prev,
        photoFile: file,
        photoPreview: reader.result as string,
      }))
    }
    reader.readAsDataURL(file)
    setError(null)
  }

  const removePhoto = () => {
    setForm(prev => ({
      ...prev,
      photoFile: null,
      photoPreview: '',
    }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadPhoto = async (clinicianId: string): Promise<string | null> => {
    if (!form.photoFile) return null

    const uploadFormData = new FormData()
    uploadFormData.append('file', form.photoFile)

    const token = localStorage.getItem('cognantic_token')
    const API_URL = import.meta.env.VITE_API_URL || 'https://cognantic-api.delightfuldesert-7407cfc7.southindia.azurecontainerapps.io/api/v1'

    try {
      const response = await fetch(`${API_URL}/Clinicians/${clinicianId}/photo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      })

      if (!response.ok) {
        console.error('Photo upload failed')
        return null
      }

      const data = await response.json()
      return data.data?.photoUrl || null
    } catch (err) {
      console.error('Photo upload error:', err)
      return null
    }
  }

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
      
      // Upload photo if selected
      if (form.photoFile && res.clinicianId) {
        await uploadPhoto(res.clinicianId)
      }
      
      setResult({ name: form.fullName, tempPassword: res.tempPassword ?? '(check server logs)', clinicianId: res.clinicianId })
      setForm({ fullName: '', email: '', specialty: '', languages: '', credential: '', bio: '', hourlyRate: '', photoFile: null, photoPreview: '' })
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

      {/* Show temp password after onboard */}
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
        {/* Photo Upload Section */}
        <div style={{ marginBottom: 24 }}>
          <label className="label">PROFILE PHOTO</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'var(--n-100)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              border: '2px solid var(--n-200)',
            }}>
              {form.photoPreview ? (
                <img src={form.photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32, color: 'var(--n-400)' }}>📷</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInputRef.current?.click()}>
                {form.photoPreview ? 'Change Photo' : 'Upload Photo'}
              </button>
              {form.photoPreview && (
                <button type="button" className="btn btn-outline btn-sm" onClick={removePhoto} style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  Remove
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" onChange={handlePhotoSelect} style={{ display: 'none' }} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--n-300)', marginTop: 8 }}>Optional. JPEG, PNG up to 5MB.</p>
        </div>

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