// ─────────────────────────────────────────────────────────────────
// src/services/adminService.ts  ── UPDATED
//
// Added:
//   getWithdrawalRequests() — fixes WithdrawalsTab showing empty forever.
//   approveWithdrawal()    — moved here from walletService for consistency.
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient';

// ── Types ─────────────────────────────────────────────────────────

export interface AdminStats {
  totalPatients: number;
  totalClinicians: number;
  scheduledSessions: number;
  totalRevenue: number;
  averageResilienceScore: number;
  recentActivities: RecentActivity[];
  lastUpdated: string;
}

export interface RecentActivity {
  description: string;
  timestamp: string;
  type: string;
}

export interface VettingApplicant {
  clinicianId: string;
  fullName: string;
  email: string;
  specialty: string;
  vettingStatus: string;
  credential: string;
  createdTime: string;
  isActive: boolean;
}

export interface VettingActionRequest {
  clinicianId: string;
  action: 'Approve' | 'Reject';
  reason?: string;
}

export interface VettingActionResponse {
  clinicianId: string;
  newStatus: string;
  actionDate: string;
  adminNotes?: string;
}

export interface ManualOnboardRequest {
  fullName: string;
  email: string;
  specialty: string;
  languages?: string;
  credential: string;
  bio?: string;
  hourlyRate: number;
}

export interface ManualOnboardResponse {
  clinicianId: string;
  fullName: string;
  email: string;
  vettingStatus: string;
  createdTime: string;
  tempPassword?: string; // ✅ NEW — returned so Admin UI can display it
}

// ── NEW: Withdrawal request type (maps to WithdrawalRequest entity) ──
export interface WithdrawalRequestItem {
  withdrawalId: string;
  clinicianId: string;
  clinicianName: string;
  amount: number;
  payoutMethod: string;
  payoutDetails: string;
  status: string;            // "Pending" | "Approved" | "Rejected" | "Transferred"
  adminNotes: string | null;
  processedAt: string | null;
  gatewayReference: string | null;
  createdTime: string;
}

// ── Service ───────────────────────────────────────────────────────

export const adminService = {

  getStats: (): Promise<AdminStats> =>
    apiClient.get<AdminStats>('/Admin/stats'),

  getVettingList: (status?: string): Promise<VettingApplicant[]> => {
    const query = status ? `?status=${status}` : '';
    return apiClient.get<VettingApplicant[]>(`/Admin/vetting-list${query}`);
  },

  processVettingAction: (body: VettingActionRequest): Promise<VettingActionResponse> =>
    apiClient.post<VettingActionResponse>('/Admin/vetting-action', body),

  manualOnboard: (body: ManualOnboardRequest): Promise<ManualOnboardResponse> =>
    apiClient.post<ManualOnboardResponse>('/Admin/manual-onboard', body),

  // ── NEW: Fetch pending withdrawal requests for the Admin Payouts tab ──
  // Endpoint: GET /api/v1/Admin/withdrawal-requests?status=Pending
  // Fixes WithdrawalsTab which was calling setIsLoading(false) without
  // ever fetching any data — so it always showed "No pending requests".
  getWithdrawalRequests: (status = 'Pending'): Promise<WithdrawalRequestItem[]> =>
    apiClient.get<WithdrawalRequestItem[]>(`/Admin/withdrawal-requests?status=${status}`),

  // ── NEW: Approve or reject a withdrawal request ──────────────────
  // Endpoint: POST /api/v1/Wallet/admin/approve-withdrawal
  // Moved here from walletService for better separation (admin action).
  approveWithdrawal: (body: {
    withdrawalId: string;
    approved: boolean;
    adminNotes?: string;
  }): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>('/Wallet/admin/approve-withdrawal', body),
};