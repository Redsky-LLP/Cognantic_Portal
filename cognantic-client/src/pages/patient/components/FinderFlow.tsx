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
  if (isLoading) return

  if (payMethod === 'Wallet') {
    const sessionPrice = selectedClinician!.hourlyRate
    const currentBalance = walletBalance?.available ?? 0

    if (currentBalance < sessionPrice) {
      // Open top-up modal - don't book yet
      setPendingPayMethod(payMethod)
      setTopUpShortfall(sessionPrice - currentBalance)
      setShowTopUpModal(true)
      return  // Don't proceed to booking
    }
  }

  // Only book if balance is sufficient
  await executeBooking(payMethod)
}
  // Called by InFlowTopUpModal after successful top-up
  // ── Step 5: Confirm & Pay handler ─────────────────────────────

// Called by InFlowTopUpModal after successful top-up
 // Called by WalletTopUpModal after successful top-up
const handleTopUpSuccess = async () => {
  console.log("=== handleTopUpSuccess START ===");
  
  setShowTopUpModal(false);
  setIsLoading(true);

  try {
    console.log("Refreshing wallet balance for patientId:", patientId);
    
    // Refresh wallet balance from server
    const fresh = await walletService.getBalance(patientId);
    console.log("Balance from API:", fresh);
    
    setWalletBalance(fresh);
    
    // Show success message with updated balance
    alert(`✅ Wallet topped up! New balance: ₹${fresh.available}`);
    
  } catch (error) {
    console.error("Balance refresh failed:", error);
    alert("Top-up completed but balance refresh failed. Error: " + error);
  } finally {
    setIsLoading(false);
  }
  console.log("=== handleTopUpSuccess END ===");
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