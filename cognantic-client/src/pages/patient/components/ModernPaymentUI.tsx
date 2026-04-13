// src/pages/patient/components/ModernPaymentUI.tsx

import { useState, useEffect, useRef } from 'react'
import { walletService } from '../../../services/walletService'

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

interface ProfileChipProps {
  user: {
    name: string
    role: string
    avatarUrl: string | null
    email?: string
  }
}

interface QRCodeProps {
  value?: string
}

interface ModernPaymentUIProps {
  amount?: number
  walletBalance?: number
  onSuccess?: () => void
}

interface PayButtonProps {
  amount: number
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  disabled: boolean
  label?: string
}

interface WalletTopUpModalProps {
  isOpen: boolean
  onClose: () => void
  shortfall?: number
  walletBalance?: number
  totalAmount?: number
  onPaymentComplete?: () => void
}

interface RippleState {
  x: number
  y: number
}

// ─────────────────────────────────────────────────────────
// COGNANTIC DESIGN TOKENS
// ─────────────────────────────────────────────────────────

const C = {
  green:      '#2D6A4F',
  greenLight: '#52B788',
  greenMid:   '#40916C',
  cream:      '#F0EDE6',
  creamDark:  '#E8E4DB',
  charcoal:   '#1A1A1A',
  slate:      '#6B7280',
  gold:       '#D4A017',
  danger:     '#E63946',
  white:      '#FFFFFF',
}

export const paymentCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes checkPop {
    0%   { transform: scale(0); opacity: 0; }
    70%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1); }
  }

  .pm-slide-up { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both; }
  .pm-fade-in  { animation: fadeIn 0.25s ease both; }
`

// ─────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────

function Spinner({ size = 18, color = C.white }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2.5px solid ${color}40`, borderTopColor: color,
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function CheckCircle({ size = 52 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: C.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'checkPop 0.4s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PROFILE CHIP
// ─────────────────────────────────────────────────────────

export function ProfileChip({ user }: ProfileChipProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const initials = user.name.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const roleColor: Record<string, string> = {
    admin: C.danger, clinician: C.greenMid, patient: C.gold,
  }
  const color = roleColor[user.role] ?? C.slate

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 14px 6px 6px',
          background: C.white, border: `1.5px solid ${C.creamDark}`,
          borderRadius: 100, cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: open ? `0 0 0 3px ${C.greenLight}30` : 'none',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: C.white, fontWeight: 600, fontSize: 13, letterSpacing: 0.5, flexShrink: 0,
        }}>
          {user.avatarUrl
            ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" />
            : initials}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal, whiteSpace: 'nowrap' }}>
            {user.name}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color }}>
            {user.role}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={C.slate} strokeWidth="2.5"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="pm-slide-up" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          background: C.white, border: `1px solid ${C.creamDark}`,
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          minWidth: 200, overflow: 'hidden', zIndex: 100,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.creamDark}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal }}>{user.name}</div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
              {user.email ?? 'support@cognantic.com'}
            </div>
          </div>
          {(['👤 My Profile', '⚙️ Settings', '🔔 Notifications', '❓ Help & Support'] as const)
            .map(label => (
              <button key={label} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                padding: '11px 16px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: 13, color: C.charcoal, textAlign: 'left',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = C.cream)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {label}
              </button>
            ))}
          <div style={{ height: 1, background: C.creamDark, margin: '4px 0' }} />
          <button style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '11px 16px', background: 'none', border: 'none',
            cursor: 'pointer', fontSize: 13, color: C.danger, textAlign: 'left',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FFF0F0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke={C.danger} strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// QR CODE
// ─────────────────────────────────────────────────────────

function QRCode({ value = 'upi://pay?pa=cognantic@upi&pn=Cognantic&am=500' }: QRCodeProps) {
  const seed = value.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rng = (n: number) => {
    const x = Math.sin(n + seed) * 10000
    return x - Math.floor(x)
  }
  const SIZE = 21
  const cells = Array.from({ length: SIZE }, (_, r) =>
    Array.from({ length: SIZE }, (_, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c >= SIZE - 7) || (r >= SIZE - 7 && c < 7)) return true
      return rng(r * SIZE + c) > 0.5
    })
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{
        background: C.white, padding: 12, borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        <svg width={168} height={168} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {cells.map((row, r) =>
            row.map((on, c) => on
              ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={C.charcoal} />
              : null
            )
          )}
        </svg>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.slate }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: C.greenLight, animation: 'pulse 1.5s ease infinite',
        }} />
        Scan with any UPI app
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// PAY BUTTON
// ─────────────────────────────────────────────────────────

function PayButton({ amount, onClick, disabled, label = 'Pay' }: PayButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        marginTop: 16, width: '100%', padding: '14px',
        background: disabled
          ? '#C0C0B8'
          : `linear-gradient(135deg, ${C.green}, ${C.greenMid})`,
        color: C.white, border: 'none', borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 15, fontWeight: 700,
        letterSpacing: 0.3, transition: 'all 0.2s',
        boxShadow: disabled ? 'none' : '0 4px 16px rgba(45,106,79,0.3)',
      }}
    >
      {label} ₹{amount}
    </button>
  )
}

// ─────────────────────────────────────────────────────────
// MODERN PAYMENT UI
// ─────────────────────────────────────────────────────────

export function ModernPaymentUI({ amount = 500, walletBalance = 0, onSuccess }: ModernPaymentUIProps) {
  const [tab,    setTab]    = useState<'upi' | 'wallet' | 'card'>('upi')
  const [upiId,  setUpiId]  = useState('')
  const [step,   setStep]   = useState<'input' | 'confirming' | 'success'>('input')
  const [, setRipple] = useState<RippleState | null>(null)

  const handlePay = async (e: React.MouseEvent<HTMLButtonElement>) => {
  const rect = e.currentTarget.getBoundingClientRect()
  setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  setStep('confirming')
  
  try {
    const patientId = localStorage.getItem('patientId') ?? localStorage.getItem('userId')
    
    if (!patientId) {
      throw new Error('Patient ID not found')
    }
    
    console.log('Calling wallet top-up API...', { patientId, amount })
    
    const result = await walletService.topUp({
      userId: patientId,
      amount: amount,
      paymentMethod: 'UPI',
      gatewayReference: `UPI-${upiId || 'web'}-${Date.now()}`
    })
    
    console.log('Top-up result:', result)
    
    if (result && result.newBalance) {
      setStep('success')
      setTimeout(() => onSuccess?.(), 1500)
    } else {
      throw new Error('Invalid response from server')
    }
    
  } catch (error) {
    console.error('Top-up error:', error)
    alert(`Top-up failed: ${error instanceof Error ? error.message : 'Please try again'}`)
    setStep('input')
  }
}

  const gpayApps: { name: string; color: string; emoji: string }[] = [
    { name: 'GPay',    color: '#4285F4', emoji: '🔵' },
    { name: 'PhonePe', color: '#5F259F', emoji: '🟣' },
    { name: 'Paytm',   color: '#00BAF2', emoji: '🔷' },
    { name: 'BHIM',    color: '#138808', emoji: '🟢' },
  ]

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px',
    border: `1.5px solid ${C.creamDark}`, borderRadius: 10,
    fontSize: 14, outline: 'none',
  }

  if (step === 'success') {
    return (
      <div className="pm-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 16, padding: '40px 24px',
      }}>
        <CheckCircle size={64} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.charcoal }}>
            ₹{amount} Added!
          </div>
          <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>
            Booking payment is processing…
          </div>
        </div>
      </div>
    )
  }

  if (step === 'confirming') {
    return (
      <div className="pm-fade-in" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, padding: '40px 24px',
      }}>
        <Spinner size={40} color={C.green} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.charcoal }}>Verifying payment…</div>
          <div style={{ fontSize: 12, color: C.slate, marginTop: 4 }}>Do not close this window</div>
        </div>
        <div style={{
          background: C.cream, borderRadius: 10, padding: '10px 20px',
          fontSize: 13, color: C.slate,
        }}>
          Adding ₹{amount} to your Cognantic Wallet
        </div>
      </div>
    )
  }

  return (
    <div className="pm-slide-up">
      {/* Amount Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${C.green} 0%, ${C.greenMid} 100%)`,
        borderRadius: '16px 16px 0 0', padding: '20px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: `${C.white}80`, letterSpacing: 1, textTransform: 'uppercase' }}>
            Top-up Amount
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.white }}>
            ₹{amount}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: `${C.white}70`, letterSpacing: 0.5 }}>Wallet after top-up</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: `${C.white}E0` }}>
            ₹{walletBalance + amount}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.creamDark}`, background: C.white }}>
        {([
          { id: 'upi',    label: '⚡ UPI / QR' },
          { id: 'wallet', label: '👛 Wallets'  },
          { id: 'card',   label: '💳 Card'     },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '13px 8px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: tab === t.id ? 600 : 500,
            color: tab === t.id ? C.green : C.slate,
            borderBottom: `2.5px solid ${tab === t.id ? C.green : 'transparent'}`,
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '24px', background: C.white, minHeight: 280 }}>

        {/* UPI Tab */}
        {tab === 'upi' && (
          <div className="pm-fade-in" style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <QRCode value={`upi://pay?pa=cognantic@upi&pn=Cognantic&am=${amount}`} />
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: 0.5, marginBottom: 10 }}>
                OR ENTER UPI ID
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  value={upiId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  style={{
                    ...inputStyle,
                    padding: '12px 44px 12px 14px',
                    borderColor: upiId ? C.greenLight : C.creamDark,
                    transition: 'border-color 0.2s',
                  }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>⚡</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {['@okicici', '@okhdfcbank', '@ybl', '@okaxis'].map(suffix => (
                  <button key={suffix}
                    onClick={() => setUpiId(v => v.split('@')[0] + suffix)}
                    style={{
                      padding: '5px 10px', borderRadius: 20,
                      border: `1px solid ${C.creamDark}`, background: C.cream,
                      fontSize: 11, cursor: 'pointer', color: C.slate, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.green; e.currentTarget.style.color = C.white }}
                    onMouseLeave={e => { e.currentTarget.style.background = C.cream; e.currentTarget.style.color = C.slate }}
                  >
                    {suffix}
                  </button>
                ))}
              </div>
              <PayButton amount={amount} onClick={handlePay} disabled={!upiId} label="Pay via UPI" />
            </div>
          </div>
        )}

        {/* Wallets Tab */}
        {tab === 'wallet' && (
          <div className="pm-fade-in">
            <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, letterSpacing: 0.5, marginBottom: 16 }}>
              SELECT WALLET APP
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {gpayApps.map(app => (
                <button key={app.name} onClick={handlePay} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 12,
                  border: `1.5px solid ${C.creamDark}`, background: C.white,
                  cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = app.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${app.color}20` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.creamDark; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `${app.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {app.emoji}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: C.charcoal }}>{app.name}</div>
                    <div style={{ fontSize: 11, color: C.slate }}>Redirect to app</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: C.slate, textAlign: 'center' }}>
              You will be redirected to complete payment
            </div>
          </div>
        )}

        {/* Card Tab */}
        {tab === 'card' && (
          <div className="pm-fade-in">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
                  CARD NUMBER
                </label>
                <input placeholder="4242 4242 4242 4242" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
                    EXPIRY
                  </label>
                  <input placeholder="MM / YY" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.slate, letterSpacing: 0.6, display: 'block', marginBottom: 6 }}>
                    CVV
                  </label>
                  <input placeholder="• • •" type="password" maxLength={3} style={inputStyle} />
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                background: C.cream, borderRadius: 10, fontSize: 12, color: C.slate,
              }}>
                🔒 Secured by 256-bit SSL · Cognantic never stores card details
              </div>
              <PayButton amount={amount} onClick={handlePay} disabled={false} label="Add ₹" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// WALLET TOP-UP MODAL
// ─────────────────────────────────────────────────────────

export function WalletTopUpModal({
  isOpen,
  onClose,
  shortfall = 285,
  walletBalance = 0,
  totalAmount = 0,
  onPaymentComplete,
}: WalletTopUpModalProps) {
  const [topUpDone,   setTopUpDone]   = useState(false)
  const [autoPaying,  setAutoPaying]  = useState(false)

  const handleTopUpSuccess = async () => {
    setTopUpDone(true)
    setAutoPaying(true)
    await new Promise(r => setTimeout(r, 1800))
    onPaymentComplete?.()
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.5)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000, padding: 20,
      animation: 'fadeIn 0.2s ease both',
    }}>
      <div className="pm-slide-up" style={{
        background: C.white, borderRadius: 20, width: '100%', maxWidth: 520,
        boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: `1px solid ${C.creamDark}`,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.charcoal }}>Top Up & Pay</div>
            <div style={{ fontSize: 13, color: C.slate, marginTop: 2 }}>
              Add ₹{shortfall} to complete your booking
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, border: 'none', background: C.cream,
            borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.slate} strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Shortfall Banner */}
        {!topUpDone && (
          <div style={{
            margin: '0 24px', marginTop: 16, padding: '12px 16px',
            background: '#FFF8E6', borderRadius: 10, border: `1px solid ${C.gold}40`,
            display: 'flex', gap: 10, alignItems: 'center', fontSize: 13,
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <div>
              <span style={{ fontWeight: 600, color: '#92600A' }}>Wallet short by ₹{shortfall}</span>
              <span style={{ color: '#A07030' }}> — top up to proceed with your ₹{totalAmount} booking</span>
            </div>
          </div>
        )}

        {/* Auto-pay Success */}
        {autoPaying && (
          <div className="pm-fade-in" style={{ padding: '32px 24px', textAlign: 'center' }}>
            <CheckCircle size={56} />
            <div style={{ marginTop: 16, fontSize: 17, fontWeight: 700, color: C.charcoal }}>
              Wallet topped up! 🎉
            </div>
            <div style={{ fontSize: 13, color: C.slate, marginTop: 6 }}>
              Confirming your booking…
            </div>
            <div style={{ marginTop: 16 }}>
              <Spinner size={22} color={C.green} />
            </div>
          </div>
        )}

        {/* Payment UI */}
        {!autoPaying && (
          <div style={{ padding: '0 0 24px 0' }}>
            <ModernPaymentUI
              amount={shortfall}
              walletBalance={walletBalance}
              onSuccess={handleTopUpSuccess}
            />
          </div>
        )}

        {/* Security Footer */}
        {!autoPaying && (
          <div style={{
            margin: '0 24px 20px', padding: '10px 14px',
            background: C.cream, borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.slate,
          }}>
            🔒 &nbsp;After top-up, your booking is confirmed <strong>automatically</strong> — no second click needed
          </div>
        )}
      </div>
    </div>
  )
}