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
