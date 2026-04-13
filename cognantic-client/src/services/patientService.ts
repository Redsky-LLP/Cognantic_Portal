// ─────────────────────────────────────────────────────────────────
// Cognantic – Patient Service
// Wires PatientIntakeForm and PatientPage Dashboard to the backend
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient'

// ── Intake Types (matches Patient_IntakeRequest / Patient_IntakeResponse) ──
export interface IntakeRequest {
  userId: string        // GUID from Users table — stored after login/register
  narrative: string     // Required clinical notes (min 1 char, max 1000)
  resilienceScore: number  // 0–100 integer
}

export interface IntakeResponse {
  id: string            // PatientId (same as UserId)
  mrNo: string          // Auto-generated, e.g. "MRN-482910"
  fullName: string      // From linked User record
  status: string        // "Active"
  createdAt: string     // ISO datetime
}

// ── Dashboard Types (matches Patient_DashboardResponse) ────────────
export interface MatchedClinician {
  clinicianId: string
  fullName: string
  specialty: string
  matchStatus: string
}

export interface DashboardResponse {
  patientId: string
  fullName: string
  mrNo: string
  resilienceScore: number
  activeMatches: MatchedClinician[]
  totalSessions: number
}
// ... existing imports and types

export interface PatientProfile {
  patientId: string;
  mrNo: string;
  fullName: string;
  resilienceScore: number;
  createdAt: string;
}

export const patientService = {
  submitIntake: (body: IntakeRequest): Promise<IntakeResponse> =>
    apiClient.post<IntakeResponse>('/Patients/intake', body),

  getDashboard: (patientId: string): Promise<DashboardResponse> =>
    apiClient.get<DashboardResponse>(`/Patients/dashboard/${patientId}`),

  /**
   * GET /api/v1/Patients/profile/{userId}
   * NEW — Used to check if a returning user already has a patient record.
   */
  getProfile: (userId: string): Promise<PatientProfile> =>
    apiClient.get<PatientProfile>(`/Patients/profile/${userId}`),
}