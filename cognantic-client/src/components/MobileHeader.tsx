import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface MobileHeaderProps {
  view: string;
  setView: (v: any) => void;
  openAuth: (role: any) => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ view, setView, openAuth }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <>
      <header className="glass-header" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        padding: '0.75rem 1rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <button onClick={() => setView('home')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--forest)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none">
              <circle cx="18" cy="7" r="5" fill="white" />
              <rect x="2" y="12" width="24" height="3.5" rx="1.75" fill="white" />
              <circle cx="12" cy="22" r="6" fill="white" />
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--charcoal)' }}>COGNANTIC</span>
        </button>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '8px' }}>
          {isMenuOpen ? '✕' : '☰'}
        </button>
      </header>
      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          zIndex: 999,
          padding: '1rem',
          animation: 'fadeIn 0.3s ease',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {['home', 'patient-auth', 'therapist-auth'].map(item => (
              <button key={item} onClick={() => {
                if (item === 'patient-auth') openAuth('patient');
                else if (item === 'therapist-auth') openAuth('therapist');
                else setView(item);
                setIsMenuOpen(false);
              }} style={{
                padding: '1rem',
                borderRadius: '12px',
                background: view === item ? 'var(--forest)' : 'var(--n-50)',
                color: view === item ? 'white' : 'var(--charcoal)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}>
                {item === 'home' ? '🏠 Home' : item === 'patient-auth' ? '👤 Patient' : '🩺 Clinician'}
              </button>
            ))}
            {user && user.role === 'admin' && (
              <button onClick={() => { setView('admin'); setIsMenuOpen(false); }} style={{
                padding: '1rem',
                borderRadius: '12px',
                background: view === 'admin' ? 'var(--forest)' : 'var(--n-50)',
                color: view === 'admin' ? 'white' : 'var(--charcoal)',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}>👑 Admin</button>
            )}
            {user ? (
              <button onClick={() => { logout(); setIsMenuOpen(false); }} style={{
                padding: '1rem',
                borderRadius: '12px',
                background: '#EF4444',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '1rem',
              }}>🚪 Sign Out</button>
            ) : (
              <button onClick={() => { openAuth('patient'); setIsMenuOpen(false); }} style={{
                padding: '1rem',
                borderRadius: '12px',
                background: 'var(--forest)',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                marginTop: '1rem',
              }}>🔐 Login / Sign Up</button>
            )}
          </nav>
        </div>
      )}
    </>
  );
};

export default MobileHeader;