// ─────────────────────────────────────────────────────────────────
// Cognantic.Domain/Entities/WithdrawalRequest.cs
// Clinician payout requests — admin approves, then transfers.
// ─────────────────────────────────────────────────────────────────

namespace Cognantic.Domain.Entities;

public class WithdrawalRequest
{
    public Guid WithdrawalId { get; set; }

    public Guid ClinicianId { get; set; }
    public virtual Clinician Clinician { get; set; } = null!;

    public decimal Amount { get; set; }

    // "UPI" | "BankTransfer"
    public string PayoutMethod { get; set; } = "UPI";

    // UPI ID or bank account number
    public string PayoutDetails { get; set; } = string.Empty;

    // "Pending" | "Approved" | "Rejected" | "Transferred"
    public string Status { get; set; } = "Pending";

    public string? AdminNotes { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string? ProcessedBy { get; set; }

    // Razorpay / payment gateway payout reference
    public string? GatewayReference { get; set; }

    public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    
}