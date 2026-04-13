// ─────────────────────────────────────────────────────────────────
// src/services/walletService.ts  ── NEW
//
// Wires the patient and clinician wallet UI to the backend.
// ─────────────────────────────────────────────────────────────────

import { apiClient } from '../api/apiClient'

// ── Types ─────────────────────────────────────────────────────────

export interface WalletTransaction {
  transactionId:   string
  transactionType: string   // "TopUp" | "BookingHold" | "OvertimeDebit" | "SessionPayout" | "Withdrawal"
  direction:       string   // "Debit" | "Credit"
  amount:          number
  balanceAfter:    number
  description:     string | null
  createdTime:     string   // ISO
}

export interface WalletBalance {
  walletId?:            string
  balance:              number
  escrowBalance:        number
  available:            number
  recentTransactions:   WalletTransaction[]
}

export interface TopUpResponse {
  walletId:      string
  newBalance:    number
  transactionId: string
}

export interface WithdrawResponse {
  withdrawalId: string
  amount:       number
  status:       string
  message:      string
}

export interface WithdrawalRequest {
  withdrawalId:     string
  amount:           number
  payoutMethod:     string
  payoutDetails:    string
  status:           string   // "Pending" | "Approved" | "Rejected" | "Transferred"
  adminNotes:       string | null
  processedAt:      string | null
  gatewayReference: string | null
  createdTime:      string
}

// ── Service ───────────────────────────────────────────────────────

export const walletService = {

  /**
   * GET /api/v1/Wallet/balance/{userId}
   * Returns current balance, escrow, and last 20 transactions.
   */
  getBalance: (userId: string): Promise<WalletBalance> =>
    apiClient.get<WalletBalance>(`/Wallet/balance/${userId}`),

  /**
   * POST /api/v1/Wallet/topup
   * Patient adds money to their wallet.
   * gatewayReference comes from the Razorpay success callback.
   */
  topUp: (body: {
    userId:            string
    amount:            number
    paymentMethod:     string
    gatewayReference?: string
  }): Promise<TopUpResponse> =>
    apiClient.post<TopUpResponse>('/Wallet/topup', body),

  /**
   * POST /api/v1/Wallet/withdraw
   * Clinician requests a payout. Admin must approve.
   */
  requestWithdrawal: (body: {
    clinicianId:  string
    amount:       number
    payoutMethod: string
    payoutDetails: string   // UPI ID or bank account number
  }): Promise<WithdrawResponse> =>
    apiClient.post<WithdrawResponse>('/Wallet/withdraw', body),

  /**
   * GET /api/v1/Wallet/withdrawals/{clinicianId}
   * Lists all withdrawal requests for a clinician.
   */
  getWithdrawals: (clinicianId: string): Promise<WithdrawalRequest[]> =>
    apiClient.get<WithdrawalRequest[]>(`/Wallet/withdrawals/${clinicianId}`),

  /**
   * POST /api/v1/Wallet/admin/approve-withdrawal
   * Admin-only: approve or reject a withdrawal.
   */
  adminApproveWithdrawal: (body: {
    withdrawalId:      string
    approved:          boolean
    adminNotes?:       string
    approvedBy?:       string
    gatewayReference?: string
  }): Promise<void> =>
    apiClient.post<void>('/Wallet/admin/approve-withdrawal', body),
}