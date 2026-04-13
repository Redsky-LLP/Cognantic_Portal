import { apiClient } from '../api/apiClient';

// ── Types ─────────────────────────────────────────────────────────

export interface MatchResult {
  clinicianId: string;
  fullName: string;
  specialty: string;
  languages?: string | null;
  matchScore: number;
  isAvailable: boolean;
  hourlyRate: number;
  // ✅ ADDED: returned by updated Clinician_MatchesResponse
  bio?: string | null;
  credential?: string | null;
  photoUrl?:    string | null
}

export interface AvailableSlot {
  slotId: string;
  clinicianId: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  isBooked: boolean;
}

export interface PlannedSession {
  sessionId: string;
  patientName: string;
  mrNo: string;
  startTime: string;
  sessionType: string;
  status: string;
  meetLink?:   string | null;
}

export interface PlannerResponse {
  clinicianId: string;
  clinicianName: string;
  dailySessions: PlannedSession[];
  totalMinutesBooked: number;
  dayRating?: number;
}

export interface SearchResult {
  clinicianId: string;
  fullName: string;
  specialty: string;
  languages?: string | null;
  credential?: string | null;
  bio?: string | null;
  hourlyRate: number;
  rating: number;
}

/**
 * Matches Clinician_GetProfileResponse from the backend.
 * Includes rejectionReason for the therapist dashboard banner.
 */
export interface ClinicianProfile {
  clinicianId: string;
  fullName: string;
  email: string;
  specialty: string;
  languages?: string | null;
  credential?: string | null;
  bio?: string | null;
  hourlyRate?: number | null;
  vettingStatus: string;           // "Pending" | "Verified" | "Rejected"
  rejectionReason?: string | null; // Admin-provided reason for rejection
  isActive: boolean;
  createdTime: string;
}

// ── API Service ───────────────────────────────────────────────────

export const clinicianService = {
  /**
   * GET /api/v1/Clinicians/matches/{patientId}
   * Returns ranked clinician matches based on patient intake data.
   */
  getMatches: (
    patientId: string,
    opts?: { specialty?: string; language?: string }
  ): Promise<MatchResult[]> => {
    const p = new URLSearchParams();
    if (opts?.specialty) p.set('specialty', opts.specialty);
    if (opts?.language) p.set('language', opts.language);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return apiClient.get<MatchResult[]>(`/Clinicians/matches/${patientId}${qs}`);
  },

  /**
   * GET /api/v1/Clinicians/{id}/available-slots
   * Returns open booking slots for a specific clinician within a date range.
   */
  getAvailableSlots: (id: string, start: string, end: string): Promise<AvailableSlot[]> =>
    apiClient.get<AvailableSlot[]>(`/Clinicians/${id}/available-slots?start=${start}&end=${end}`),

  /**
   * GET /api/v1/Clinicians/{id}/planner
   * Returns the therapist's daily session planner and booking summary.
   */
  getPlanner: (id: string, date?: string): Promise<PlannerResponse> => {
    const qs = date ? `?date=${date}` : '';
    return apiClient.get<PlannerResponse>(`/Clinicians/${id}/planner${qs}`);
  },

  /**
   * GET /api/v1/Clinicians/search
   * Public-facing search for verified clinicians.
   */
  search: (opts?: {
    specialty?: string;
    maxHourlyRate?: number;
    searchTerm?: string;
  }): Promise<SearchResult[]> => {
    const p = new URLSearchParams();
    if (opts?.specialty) p.set('specialty', opts.specialty);
    if (opts?.maxHourlyRate) p.set('maxHourlyRate', String(opts.maxHourlyRate));
    if (opts?.searchTerm) p.set('searchTerm', opts.searchTerm);
    const qs = p.toString() ? `?${p.toString()}` : '';
    return apiClient.get<SearchResult[]>(`/Clinicians/search${qs}`);
  },

  /**
   * POST /api/v1/Clinicians
   * Submits clinician onboarding data. Sets status to "Pending".
   */
  createProfile: (body: {
    userId: string;
    fullName: string;
    email: string;
    specialty: string;
    languages?: string;
    credential?: string;
    bio?: string;
    hourlyRate: number;
  }) => apiClient.post('/Clinicians', body),

  /**
   * GET /api/v1/Clinicians/profile/{userId}
   * Fetches profile state to restore session data (clinicianId, vettingStatus).
   * Essential for handling page refreshes or returning users.
   */
  getProfile: (userId: string): Promise<ClinicianProfile> =>
    apiClient.get<ClinicianProfile>(`/Clinicians/profile/${userId}`),
};