import React from 'react'

interface Props {
  size?: number
  color?: string
  label?: string
}

const LoadingSpinner: React.FC<Props> = ({
  size  = 32,
  color = 'var(--forest)',
  label = 'Loading…',
}) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: '48px',
  }}>
    <style>{`
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
    <div style={{
      width: size, height: size,
      border: `3px solid ${color}22`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
    }} />
    {label && (
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--n-400)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        {label}
      </span>
    )}
  </div>
)

export default LoadingSpinner
