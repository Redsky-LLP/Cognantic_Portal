// ─────────────────────────────────────────────────────────────────
// Cognantic – Auth Service
// Wires AuthModal & useAuth to the .NET AuthController
// ─────────────────────────────────────────────────────────────────

import { apiClient, setToken, clearToken } from '../api/apiClient'

// ── Response Types (matches C# Auth_LoginResponse / Auth_RegisterResponse) ──
export interface UserProfile {
  id: string           // Guid
  name: string         // FullName
  email: string
  role: 'patient' | 'therapist' | 'admin'
  avatarUrl?: string | null
}

export interface AuthResponse {
  token: string
  refreshToken: string
  user: UserProfile
  // 🟢 Added to match backend wiring
  patientId?: string | null
  clinicianId?: string | null
}

// ── Request Types ─────────────────────────────────────────────────
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  role: 'patient' | 'therapist'
  // ✅ FIX: Optional Supabase Auth UID.
  // When provided, the backend sets Users.Id = externalId so the row's
  // primary key matches the Supabase auth sub-claim.
  // Without this, the backend generates Guid.NewGuid() and wallet/profile
  // lookups that use the Supabase UID will always return "User not found".
  externalId?: string | null
}

// ── Auth API ──────────────────────────────────────────────────────
export const authService = {
  /**
   * POST /api/v1/Auth/login
   * Verifies credentials, returns JWT + UserProfile.
   * Automatically stores the token in memory + localStorage.
   */
  login: async (body: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/Auth/login', body)
    setToken(res.token)
    return res
  },

  /**
   * POST /api/v1/Auth/register
   * Creates a new User row (patient or therapist role).
   * Pass externalId = Supabase user UID when using Supabase Auth so that
   * Users.Id in the database matches the auth sub-claim stored in the JWT.
   * Does NOT create a Patient or Clinician profile — that happens in intake.
   */
  register: async (body: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/Auth/register', body)
    setToken(res.token)
    return res
  },

  /**
   * POST /api/v1/Auth/forgot-password
   * Sends a recovery email. Always returns 200 (security by design).
   */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post<void>('/Auth/forgot-password', { email })
  },

  /**
   * POST /api/v1/Auth/reset-password
   * Resets the password using the email from the recovery link.
   */
  resetPassword: async (email: string, newPassword: string): Promise<void> => {
    await apiClient.post<void>('/Auth/reset-password', { email, newPassword })
  },

  /**
   * Client-side logout. No server call needed (no JWT blacklist yet).
   */
  logout: () => {
    clearToken()
    localStorage.removeItem('cognantic_user')
    localStorage.removeItem('userId')
    localStorage.removeItem('cognantic_current_view')
  },
}