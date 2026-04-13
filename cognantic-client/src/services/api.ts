// src/services/api.ts
// Go UP one folder (out of services), and DOWN into the api folder!
import apiClient from '../api/apiClient';
import type {
  LoginRequest, RegisterRequest, AuthResponse, Patient, Therapist, MatchResult,
  BookingRequest, Session, AdminStats, VettingApplicant, AuditLog, RevenueDataPoint,
  PaginatedResponse, IntakeProfile
} from '../types';

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<AuthResponse>('/Auth/login', body),
  register: (body: RegisterRequest) => apiClient.post<AuthResponse>('/Auth/register', body),
  forgotPassword: (email: string) => apiClient.post<{ message: string }>('/Auth/forgot-password', { email }),
  resetPassword: (body: { email: string; NewPassword: string }) => apiClient.post<{ message: string }>('/Auth/reset-password', body),
  logout: () => apiClient.post<void>('/Auth/logout'),
};

export const patientApi = {
  getProfile: (id: string) => apiClient.get<Patient>(`/patients/${id}`),
  updateProfile: (id: string, body: Partial<Patient>) => apiClient.patch<Patient>(`/patients/${id}`, body),
  submitIntake: (id: string, intake: IntakeProfile) => apiClient.post<MatchResult[]>(`/patients/${id}/intake`, intake),
  getMatches: (id: string) => apiClient.get<MatchResult[]>(`/patients/${id}/matches`),
  getSessions: (id: string) => apiClient.get<PaginatedResponse<Session>>(`/patients/${id}/sessions`),
  bookSession: (body: BookingRequest) => apiClient.post<Session>('/sessions', body),
  cancelSession: (sessionId: string) => apiClient.post<Session>(`/sessions/${sessionId}/cancel`),
};

export const therapistApi = {
  getProfile: (id: string) => apiClient.get<Therapist>(`/therapists/${id}`),
  updateProfile: (id: string, body: Partial<Therapist>) => apiClient.patch<Therapist>(`/therapists/${id}`, body),
  getSchedule: (id: string, weekStart: string) => apiClient.get<Session[]>(`/therapists/${id}/schedule?weekStart=${weekStart}`),
  approveRequest: (sessionId: string) => apiClient.post<Session>(`/sessions/${sessionId}/approve`),
};

// Expose them cleanly to views!
export default {
  auth: authApi,
  patient: patientApi,
  therapist: therapistApi,
};