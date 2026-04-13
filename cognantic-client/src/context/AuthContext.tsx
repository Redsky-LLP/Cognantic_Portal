// PATH: src/context/AuthContext.tsx
//
// Fixes applied:
//  1. Added forgotPassword(email) to AuthContextValue interface + provider.
//     AuthModal destructures it from useAuth() — without it, calling
//     forgotPassword() throws "TypeError: forgotPassword is not a function".
//
//  2. Added resetPassword(email, newPassword) for the same reason.
//
//  3. These two functions don't touch auth state (user/token) so they
//     simply delegate to authService directly — no isLoading spinner,
//     no error state update. AuthModal handles their own UI feedback.

import React, { createContext, useContext, useState, useCallback } from 'react'
import { authService } from '../services/authService'
import { clinicianService } from '../services/clinicianService'
import { patientService } from '../services/patientService'
import { setToken, clearToken } from '../api/apiClient'
import type { UserProfile } from '../services/authService'

// ── Shape ─────────────────────────────────────────────────────────
interface AuthContextValue {
  user: UserProfile | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<any>
  register: (fullName: string, email: string, password: string, role: 'patient' | 'therapist') => Promise<any>
  logout: () => void
  // ✅ FIX: Added — AuthModal needs these; without them useAuth() returns undefined
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (email: string, newPassword: string) => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null)

// ── Helper: load persisted user from localStorage ─────────────────
function loadPersistedUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem('cognantic_user')
    if (!raw || raw === 'null' || raw === 'undefined') return null
    return JSON.parse(raw) as UserProfile
  } catch {
    localStorage.removeItem('cognantic_user')
    return null
  }
}

// ── Provider ──────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]           = useState<UserProfile | null>(loadPersistedUser)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  // ── Login ──────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authService.login({ email, password })

      localStorage.setItem('cognantic_user', JSON.stringify(res.user))
      localStorage.setItem('userId', res.user.id)
      if (res.token) {
        localStorage.setItem('cognantic_token', res.token)
        setToken(res.token)
      }

      // ── Therapist: persist clinician profile IDs ───────────────
      if (res.user.role === 'therapist') {
        if ((res as any).clinicianId) {
          localStorage.setItem('clinicianId', String((res as any).clinicianId))
        }
        if ((res as any).vettingStatus) {
          localStorage.setItem('clinicianVettingStatus', (res as any).vettingStatus)
        }
        if ((res as any).rejectionReason) {
          localStorage.setItem('clinicianRejectionReason', (res as any).rejectionReason)
        } else {
          localStorage.removeItem('clinicianRejectionReason')
        }

        // Fallback: fetch profile if not returned inline by login response
        if (!localStorage.getItem('clinicianId')) {
          try {
            const profile = await clinicianService.getProfile(res.user.id)
            if (profile?.clinicianId) {
              localStorage.setItem('clinicianId', String(profile.clinicianId))
              localStorage.setItem('clinicianVettingStatus', profile.vettingStatus ?? 'Pending')
              if (profile.rejectionReason) {
                localStorage.setItem('clinicianRejectionReason', profile.rejectionReason)
              }
            }
          } catch {
            localStorage.removeItem('clinicianId')
          }
        }
      }

      // ── Patient: persist patient profile ID ───────────────────
      if (res.user.role === 'patient') {
        if ((res as any).patientId) {
          localStorage.setItem('patientId', String((res as any).patientId))
        }
        if (!localStorage.getItem('patientId')) {
          try {
            const profile = await patientService.getProfile(res.user.id)
            const pid = profile?.patientId ?? (profile as any)?.id
            if (pid) localStorage.setItem('patientId', String(pid))
          } catch {
            localStorage.removeItem('patientId')
          }
        }
      }

      // ✅ Single state update — Header, App, all subscribers re-render instantly
      setUser(res.user)
      setIsLoading(false)
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed'
      setError(msg)
      setIsLoading(false)
      throw err
    }
  }, [])

  // ── Register ───────────────────────────────────────────────────
  const register = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    role: 'patient' | 'therapist'
  ) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await authService.register({ fullName, email, password, role })
      localStorage.setItem('cognantic_user', JSON.stringify(res.user))
      localStorage.setItem('userId', res.user.id)
      if (res.token) {
        localStorage.setItem('cognantic_token', res.token)
        setToken(res.token)
      }
      // Clear any stale profile IDs from a previous session
      localStorage.removeItem('clinicianId')
      localStorage.removeItem('patientId')
      localStorage.removeItem('clinicianVettingStatus')
      localStorage.removeItem('clinicianRejectionReason')

      // ✅ Set user immediately — callers can then call onSuccess() directly
      setUser(res.user)
      setIsLoading(false)
      return res
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      setError(msg)
      setIsLoading(false)
      throw err
    }
  }, [])

  // ── Logout ─────────────────────────────────────────────────────
  const logout = useCallback(() => {
    authService.logout()
    clearToken()
    localStorage.removeItem('cognantic_user')
    localStorage.removeItem('userId')
    localStorage.removeItem('cognantic_token')
    localStorage.removeItem('clinicianId')
    localStorage.removeItem('patientId')
    localStorage.removeItem('clinicianVettingStatus')
    localStorage.removeItem('clinicianRejectionReason')
    localStorage.removeItem('cognantic_current_view')
    setUser(null)
  }, [])

  // ── Forgot Password ────────────────────────────────────────────
  // ✅ FIX: Added — AuthModal calls this; without it useAuth() returns undefined
  // Does not touch auth state (user/token), so no isLoading/error update.
  const forgotPassword = useCallback(async (email: string): Promise<void> => {
    await authService.forgotPassword(email)
  }, [])

  // ── Reset Password ─────────────────────────────────────────────
  // ✅ FIX: Added — same reason as forgotPassword above.
  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<void> => {
    await authService.resetPassword(email, newPassword)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, isLoading, error,
      login, register, logout,
      forgotPassword, resetPassword,   // ✅ exposed to all consumers
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Consumer hook ──────────────────────────────────────────────────
export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>')
  return ctx
}