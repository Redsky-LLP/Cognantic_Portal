// ─────────────────────────────────────────────────────────────────
// Cognantic – Shared TypeScript Types
// ─────────────────────────────────────────────────────────────────

export type ViewType = 'home' | 'patient' | 'therapist' | 'admin'
export type AuthRole = 'patient' | 'therapist'
export type AuthMode = 'login' | 'register' | 'forgot'

// ── Auth ──────────────────────────────────────────────────────────
export interface LoginRequest {
  email:    string
  password: string
  role:     AuthRole
}

export interface RegisterRequest {
  fullName: string
  email:    string
  password: string
  role:     AuthRole
}

export interface AuthResponse {
  token:   string
  user:    User
  message: string
}

// ── User ─────────────────────────────────────────────────────────
export interface User {
  id:        string
  name:      string
  email:     string
  role:      AuthRole
  createdAt: string
}

// ── Patient ──────────────────────────────────────────────────────
export interface Patient extends User {
  role:            'patient'
  resilienceScore: number
  currentTherapist?: TherapistSummary
  sessions:         Session[]
  intakeProfile?:   IntakeProfile
}

export interface IntakeProfile {
  ageGroup:    string
  language:    string
  location:    string
  sessionMode: 'video' | 'voice' | 'chat'
  narrative:   string
}

// ── Therapist ─────────────────────────────────────────────────────
export interface Therapist extends User {
  role:          'therapist'
  specialization: string
  credentials:   string
  experience:    number       // years
  rating:        number       // 0-5
  totalSessions: number
  hourlyRate:    number       // USD
  availability:  AvailabilitySlot[]
  status:        'active' | 'pending' | 'suspended'
  matchScore?:   number       // 0-100, returned in match context
  languages: string[]; // 👈 Added: Array of languages spoken (e.g., ['English', 'Malayalam'])
}

export interface TherapistSummary {
  id:             string
  name:           string
  specialization: string
  rating:         number
  hourlyRate:     number
  languages: string[]; // 👈 Added here as well for cards/summaries
}

export interface AvailabilitySlot {
  date:      string           // ISO date string
  timeSlots: string[]         // ['09:00', '11:30', …]
  blocked:   boolean
  blockNote?: string
}

// ── Booking / Session ─────────────────────────────────────────────
export interface BookingRequest {
  patientId:    string
  therapistId:  string
  date:         string
  timeSlot:     string
  sessionMode:  'video' | 'voice' | 'chat'
}

export interface Session {
  id:           string
  patientId:    string
  therapistId:  string
  date:         string
  timeSlot:     string
  status:       'scheduled' | 'completed' | 'cancelled' | 'pending'
  sessionType:  string        // e.g. 'CBT Session', 'Initial Audit'
  notes?:       string
  amount:       number
}

// ── Matching ──────────────────────────────────────────────────────
export interface MatchResult {
  therapist:   Therapist
  matchScore:  number         // 0-100
  matchReasons: string[]
}

// ── Admin ─────────────────────────────────────────────────────────
export interface VettingApplicant {
  id:             number
  name:           string
  email:          string
  specialization: string
  credential:     string
  appliedAt:      string
  licenseUrl:     string
  status:         'pending' | 'approved' | 'declined'
}

export interface AdminStats {
  totalPatients:     number
  activeTherapists:  number
  platformBalance:   number
  avgRetention:      number
  pendingVetting:    number
}

export interface AuditLog {
  id:        string
  timestamp: string
  type:      'AUTH' | 'PAY' | 'VET' | 'SYS' | 'ALERT'
  message:   string
  ipAddress?: string
}

export interface RevenueDataPoint {
  month:       string
  gross:       number
  payout:      number
  platformNet: number
}

// ── API Response wrapper ──────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean
  data:    T
  message?: string
  error?:  string
}

export interface PaginatedResponse<T> {
  items:      T[]
  total:      number
  page:       number
  pageSize:   number
  totalPages: number
}
