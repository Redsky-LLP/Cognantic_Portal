import React from 'react'

interface Props {
  icon?:    string
  title:    string
  subtitle?: string
  action?:  React.ReactNode
}

const EmptyState: React.FC<Props> = ({ icon = '📭', title, subtitle, action }) => (
  <div style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '64px 32px', textAlign: 'center',
  }}>
    <div style={{ fontSize: 48, marginBottom: 20 }}>{icon}</div>
    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 8, fontWeight: 400 }}>
      {title}
    </h4>
    {subtitle && (
      <p style={{ color: 'var(--n-400)', fontSize: 14, maxWidth: 320, lineHeight: 1.6, marginBottom: 28 }}>
        {subtitle}
      </p>
    )}
    {action}
  </div>
)

export default EmptyState
