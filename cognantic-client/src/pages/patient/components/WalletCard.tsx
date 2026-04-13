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