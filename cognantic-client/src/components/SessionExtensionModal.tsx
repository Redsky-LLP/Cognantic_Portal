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