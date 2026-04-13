// ─────────────────────────────────────────────────────────────────
// src/services/sessionService.ts  ── UPDATED
//
// Changes from previous version:
//   1. Added startSession(sessionId, clinicianId)
//   2. Added endSession(sessionId, clinicianId) → returns overtime info
//   3. Added getEarnings(clinicianId) → clinician earnings summary
//   4. SessionEndResult type added
// All existing exports (BookingRequest, BookingResponse,
// UpcomingSession, book, getUpcoming, updateMeetLink) are unchanged.
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient'

// ── Booking ───────────────────────────────────────────────────────

export interface BookingRequest {
  patientId:    string
  clinicianId:  string
  sessionDate:  string
  sessionType?: string
  amount:       number
  notes?:       string
  meetLink?:    string
}

export interface BookingResponse {
  sessionId:          string
  patientId:          string
  clinicianId:        string
  status:             string
  scheduledAt:        string
  meetLink?:          string | null
  confirmationCode?:  string | null
  clinicianName:      string
}

// ── Upcoming Sessions (Patient Dashboard) ─────────────────────────

export interface UpcomingSession {
  sessionId:          string
  sessionDate:        string
  sessionType:        string
  status:             string
  meetLink?:          string | null
  confirmationCode?:  string | null
  clinicianName:      string
  amount:             number
}

// ── Session End / Overtime ── NEW ─────────────────────────────────

export interface SessionEndResult {
  sessionId:       string
  overtimeMinutes: number
  overtimeCharged: number
  baseAmount:      number
  totalCharged:    number
  message:         string
}

// ── Clinician Earnings ── NEW ─────────────────────────────────────

export interface EarningTransaction {
  transactionId:   string
  transactionType: string
  amount:          number
  description:     string | null
  createdTime:     string
}

export interface EarningsSummary {
  balance:       number
  escrowBalance: number
  available:     number
  transactions:  EarningTransaction[]
}

// ── Service ───────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:7208/api/v1'

export const sessionService = {

  /**
   * POST /api/v1/Sessions/book
   * Creates a Session + holds patient wallet escrow.
   */
  book: (body: BookingRequest): Promise<BookingResponse> =>
    apiClient.post<BookingResponse>('/Sessions/book', body),

  /**
   * GET /api/v1/Sessions/upcoming/{patientId}
   * Returns scheduled future sessions for the patient dashboard.
   */
  getUpcoming: (patientId: string): Promise<UpcomingSession[]> =>
    apiClient.get<UpcomingSession[]>(`/Sessions/upcoming/${patientId}`),

  /**
   * PATCH /api/v1/Sessions/{sessionId}/meet-link
   * Clinician updates the Zoom/Meet URL after booking.
   */
  updateMeetLink: (sessionId: string, meetLink: string): Promise<void> =>
    apiClient.patch<void>(`/Sessions/${sessionId}/meet-link`, { meetLink }),

  /**
   * POST /api/v1/Sessions/{sessionId}/start
   * Clinician clicks "Start Session" — records ActualStartTime.
   */
  startSession: (sessionId: string, clinicianId: string): Promise<void> =>
    apiClient.post<void>(`/Sessions/${sessionId}/start`, { clinicianId }),

  /**
   * POST /api/v1/Sessions/{sessionId}/end
   * Clinician clicks "End Session":
   *   • Records ActualEndTime
   *   • Computes overtime (every 5 min beyond 60 min)
   *   • Auto-debits patient wallet for overtime
   *   • Credits clinician wallet (base + overtime, minus platform cut)
   */
  endSession: (sessionId: string, clinicianId: string): Promise<SessionEndResult> =>
    apiClient.post<SessionEndResult>(`/Sessions/${sessionId}/end`, { clinicianId }),

  /**
   * GET /api/v1/Sessions/earnings/{clinicianId}
   * Returns the clinician's earnings balance and credit history.
   */
  getEarnings: (clinicianId: string): Promise<EarningsSummary> =>
    apiClient.get<EarningsSummary>(`/Sessions/earnings/${clinicianId}`),

  /**
   * POST extend session (direct fetch)
   */
  extendSession: (sessionId: string, body: unknown): Promise<unknown> =>
    fetch(`${API_URL}/Sessions/${sessionId}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()),
}