// ─────────────────────────────────────────────────────────────────
// Cognantic.Domain/Entities/Wallet.cs
// One wallet per User (Patient OR Clinician).
// UserId is the shared PK — same pattern as Patient/Clinician.
// ─────────────────────────────────────────────────────────────────

namespace Cognantic.Domain.Entities;

public class Wallet
{
    public Guid WalletId { get; set; }

    // FK → Users.Id  (patient or clinician)
    public Guid UserId { get; set; }
    public virtual User User { get; set; } = null!;

    // "patient" | "clinician"
    public string OwnerType { get; set; } = string.Empty;

    public decimal Balance { get; set; } = 0m;

    // Running total held in escrow (deducted at booking, released on completion)
    public decimal EscrowBalance { get; set; } = 0m;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    

    public virtual ICollection<WalletTransaction> Transactions { get; set; } = new List<WalletTransaction>();
}