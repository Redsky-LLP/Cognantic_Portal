// ─────────────────────────────────────────────────────────────────
// Cognantic.Domain/Entities/WalletTransaction.cs
// Immutable audit log for every debit / credit.
// ─────────────────────────────────────────────────────────────────

namespace Cognantic.Domain.Entities;

public class WalletTransaction
{
    public Guid TransactionId { get; set; }

    public Guid WalletId { get; set; }
    public virtual Wallet Wallet { get; set; } = null!;

    // Optional link to the session that triggered this movement
    public Guid? SessionId { get; set; }
    public virtual Session? Session { get; set; }

    // "TopUp" | "BookingHold" | "BookingRelease" | "OvertimeDebit"
    // | "SessionPayout" | "Withdrawal" | "Refund"
    public string TransactionType { get; set; } = string.Empty;

    // "Debit" | "Credit"
    public string Direction { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    // Balance AFTER this transaction (snapshot for auditing)
    public decimal BalanceAfter { get; set; }

    public string? Description { get; set; }

    // "Completed" | "Pending" | "Failed"
    public string Status { get; set; } = "Completed";

    public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";
}