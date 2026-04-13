using System.ComponentModel.DataAnnotations; // 👈 Add this for the [Key] attribute

namespace Cognantic.Domain.Entities;

/// <summary>
/// Immutable audit record for every extension attempt on a session.
/// States: Requested → FundsVerified → ClinicianApproved → Completed | Declined | Failed
/// </summary>
public class SessionExtension
{
    [Key] // 👈 Explicitly tells EF this is the Primary Key
    public Guid ExtensionId { get; set; } = Guid.NewGuid();

    public Guid SessionId { get; set; }
    public virtual Session Session { get; set; } = null!;

    /// <summary>10 or 15 — the only valid values</summary>
    public int ExtensionMinutes { get; set; }

    public decimal AmountCharged { get; set; }

    /// <summary>Requested | FundsVerified | ClinicianApproved | Completed | Declined | Failed</summary>
    public string Status { get; set; } = "Requested";

    /// <summary>True = wallet had enough. False = UPI top-up was required.</summary>
    public bool PaidFromWallet { get; set; }

    public decimal WalletContribution { get; set; }
    public decimal UpiContribution { get; set; }

    // Audit
    public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedTime { get; set; }
    public string CreatedBy { get; set; } = "System";
}