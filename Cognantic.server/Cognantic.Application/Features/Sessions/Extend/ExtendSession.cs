using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.Application.Features.Sessions.Extend;

// ── Request ──────────────────────────────────────────────────────
public class ExtendSessionCommand : IRequest<Result<ExtendSessionResponse>>
{
    public Guid SessionId { get; set; }
    public Guid PatientId { get; set; }

    /// <summary>10 or 15 only</summary>
    public int ExtensionMinutes { get; set; }

    /// <summary>
    /// If wallet is insufficient, the client does a UPI top-up first,
    /// then re-calls with UpiTopUpAmount > 0. The handler credits wallet
    /// first, then debits — keeping a single clean flow.
    /// </summary>
    public decimal UpiTopUpAmount { get; set; } = 0m;
    public string? UpiGatewayRef { get; set; }
}

// ── Response ─────────────────────────────────────────────────────
public class ExtendSessionResponse
{
    public Guid ExtensionId { get; set; }
    public string Status { get; set; } = string.Empty;   // "Completed" | "InsufficientFunds"
    public decimal AmountCharged { get; set; }
    public decimal WalletBalance { get; set; }
    public DateTime NewScheduledEndTime { get; set; }
    public string Message { get; set; } = string.Empty;
}

// ── Handler ──────────────────────────────────────────────────────
public class ExtendSessionHandler
    : IRequestHandler<ExtendSessionCommand, Result<ExtendSessionResponse>>
{
    private const decimal PlatformCutPct = 0.15m;

    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public ExtendSessionHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<ExtendSessionResponse>> Handle(
        ExtendSessionCommand cmd, CancellationToken ct)
    {
        await using var _ctx = await _ctxFactory.CreateDbContextAsync(ct);

        // ── 1. Load session ───────────────────────────────────────
        var session = await _ctx.Sessions
            .Include(s => s.Clinician)
            .FirstOrDefaultAsync(s => s.SessionId == cmd.SessionId, ct);

        if (session == null)
            return Result<ExtendSessionResponse>.Failure("Session not found.");

        if (session.PatientId != cmd.PatientId)
            return Result<ExtendSessionResponse>.Failure("Unauthorized.");

        if (session.Status != "InProgress")
            return Result<ExtendSessionResponse>.Failure("Session is not in progress.");

        if (cmd.ExtensionMinutes != 10 && cmd.ExtensionMinutes != 15)
            return Result<ExtendSessionResponse>.Failure("Extension must be 10 or 15 minutes.");

        // ── 2. Calculate cost ─────────────────────────────────────
        var hourlyRate = session.Clinician.HourlyRate
            ?? (session.Amount / 60m * 60m);
        var cost = Math.Round(hourlyRate / 60m * cmd.ExtensionMinutes, 2);

        // ── 3. Get patient wallet ─────────────────────────────────
        var wallet = await _ctx.Wallets
            .FirstOrDefaultAsync(w => w.UserId == cmd.PatientId, ct);

        if (wallet == null)
            return Result<ExtendSessionResponse>.Failure("Patient wallet not found.");

        // ── 4. Handle UPI top-up if provided (Saga: FundsVerified) ──
        decimal upiContribution = 0m;
        if (cmd.UpiTopUpAmount > 0)
        {
            wallet.Balance += cmd.UpiTopUpAmount;
            upiContribution = cmd.UpiTopUpAmount;

            _ctx.WalletTransactions.Add(new WalletTransaction
            {
                TransactionId = Guid.NewGuid(),
                WalletId = wallet.WalletId,
                SessionId = session.SessionId,
                TransactionType = "TopUp",
                Direction = "Credit",
                Amount = cmd.UpiTopUpAmount,
                BalanceAfter = wallet.Balance,
                Description = $"UPI top-up for extension (ref: {cmd.UpiGatewayRef})",
                CreatedBy = "System_ExtensionTopUp"
            });
        }

        // ── 5. Check balance ──────────────────────────────────────
        if (wallet.Balance < cost)
        {
            // Signal to client: show UPI payment modal
            return Result<ExtendSessionResponse>.Success(new ExtendSessionResponse
            {
                Status = "InsufficientFunds",
                AmountCharged = cost,
                WalletBalance = wallet.Balance,
                Message = $"Wallet balance ₹{wallet.Balance} is insufficient. ₹{cost - wallet.Balance} more needed."
            });
        }

        // ── 6. Debit wallet (Saga: ClinicianApproved → Completed) ─
        var walletContribution = cost - upiContribution;
        wallet.Balance -= cost;

        _ctx.WalletTransactions.Add(new WalletTransaction
        {
            TransactionId = Guid.NewGuid(),
            WalletId = wallet.WalletId,
            SessionId = session.SessionId,
            TransactionType = "ExtensionDebit",
            Direction = "Debit",
            Amount = cost,
            BalanceAfter = wallet.Balance,
            Description = $"Extension {cmd.ExtensionMinutes} min",
            CreatedBy = "System_ExtensionEngine"
        });

        // ── 7. Pay clinician ──────────────────────────────────────
        var clinicianWallet = await _ctx.Wallets
            .FirstOrDefaultAsync(w => w.UserId == session.ClinicianId, ct);

        if (clinicianWallet != null)
        {
            var clinicianShare = Math.Round(cost * (1 - PlatformCutPct), 2);
            clinicianWallet.Balance += clinicianShare;

            _ctx.WalletTransactions.Add(new WalletTransaction
            {
                TransactionId = Guid.NewGuid(),
                WalletId = clinicianWallet.WalletId,
                SessionId = session.SessionId,
                TransactionType = "ExtensionPayout",
                Direction = "Credit",
                Amount = clinicianShare,
                BalanceAfter = clinicianWallet.Balance,
                Description = $"Extension payout {cmd.ExtensionMinutes} min",
                CreatedBy = "System_ExtensionEngine"
            });
        }

        // ── 8. Update session ─────────────────────────────────────
        session.ExtendedMinutes += cmd.ExtensionMinutes;
        session.ScheduledEndTime = session.ScheduledEndTime.AddMinutes(cmd.ExtensionMinutes);
        session.OvertimeMinutes += cmd.ExtensionMinutes;
        session.OvertimeCharged += cost;

        // ── 9. Record extension audit row ────────────────────────
        var ext = new SessionExtension
        {
            ExtensionId = Guid.NewGuid(),
            SessionId = session.SessionId,
            ExtensionMinutes = cmd.ExtensionMinutes,
            AmountCharged = cost,
            Status = "Completed",
            PaidFromWallet = upiContribution == 0,
            WalletContribution = walletContribution,
            UpiContribution = upiContribution,
            CompletedTime = DateTime.UtcNow,
            CreatedBy = "System_ExtensionEngine"
        };
        _ctx.Set<SessionExtension>().Add(ext);

        await _ctx.SaveChangesAsync(CancellationToken.None);

        return Result<ExtendSessionResponse>.Success(new ExtendSessionResponse
        {
            ExtensionId = ext.ExtensionId,
            Status = "Completed",
            AmountCharged = cost,
            WalletBalance = wallet.Balance,
            NewScheduledEndTime = session.ScheduledEndTime,
            Message = $"Extended by {cmd.ExtensionMinutes} min. ₹{cost} charged."
        });
    }
}