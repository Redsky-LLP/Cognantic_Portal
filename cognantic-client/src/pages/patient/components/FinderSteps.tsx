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
         {/* UPDATED: Responsive grid - auto-fit with minmax for mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
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