import React, { useEffect } from 'react'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Props {
  message:  string
  variant?: ToastVariant
  onClose:  () => void
  duration?: number
}

const COLORS: Record<ToastVariant, { bg: string; icon: string }> = {
  success: { bg: 'var(--forest)', icon: '✓' },
  error:   { bg: 'var(--danger)', icon: '✕' },
  warning: { bg: 'var(--warning)', icon: '⚠' },
  info:    { bg: 'var(--info)',    icon: 'ℹ' },
}

const Toast: React.FC<Props> = ({ message, variant = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const { bg, icon } = COLORS[variant]

  return (
    <div style={{
      position: 'fixed', bottom: 32, right: 32, zIndex: 3000,
      display: 'flex', alignItems: 'center', gap: 12,
      background: bg, color: 'white',
      padding: '14px 20px', borderRadius: 'var(--r-md)',
      boxShadow: '0 8px 24px rgba(28,28,30,0.2)',
      animation: 'fadeUp 0.3s ease',
      maxWidth: 360,
    }}>
      <span style={{ fontWeight: 800, fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer', marginLeft: 8, fontSize: 16, lineHeight: 1,
      }}>✕</button>
    </div>
  )
}

export default Toast
