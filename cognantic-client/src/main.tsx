// ─────────────────────────────────────────────────────────────────
// src/main.tsx  ── UPDATED
//
// Wraps <App> with <AuthProvider> so all components share one
// auth state instance (fixes the Header not updating on login).
// ─────────────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)