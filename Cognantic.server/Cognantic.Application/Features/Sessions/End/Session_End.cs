using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Sessions.End;

public class Session_EndRequest : IRequest<Result<Session_EndResponse>>
{
    public Guid SessionId { get; set; }
    public Guid ClinicianId { get; set; }
}

public class Session_EndResponse
{
    public Guid SessionId { get; set; }
    public int OvertimeMinutes { get; set; }
    public decimal OvertimeCharged { get; set; }
    public decimal BaseAmount { get; set; }
    public decimal TotalCharged { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class Session_EndHandler : IRequestHandler<Session_EndRequest, Result<Session_EndResponse>>
{
    private const decimal PlatformCutPct = 0.15m;
    private const int BaseDurationMinutes = 60;

    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Session_EndHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _ctxFactory = ctxFactory;
    }

    public async Task<Result<Session_EndResponse>> Handle(Session_EndRequest req, CancellationToken ct)
    {
        await using var ctx = await _ctxFactory.CreateDbContextAsync(ct);

        var session = await ctx.Sessions
            .Include(s => s.Clinician)
            .Include(s => s.Patient)
            .FirstOrDefaultAsync(s => s.SessionId == req.SessionId, ct);

        if (session == null) return Result<Session_EndResponse>.Failure("Session not found.");
        if (session.ClinicianId != req.ClinicianId) return Result<Session_EndResponse>.Failure("Unauthorized.");

        var now = DateTime.UtcNow;
        session.ActualEndTime = now;
        session.ActualStartTime ??= session.SessionDate;
        session.Status = "Completed";

        var actualDuration = (now - session.ActualStartTime.Value).TotalMinutes;
        var overtimeMins = Math.Max(0, (int)Math.Floor(actualDuration) - BaseDurationMinutes);
        var overtimeBands = overtimeMins / 5;

        var patientWallet = await GetOrCreateWallet(ctx, session.PatientId, "patient", ct);
        var clinicianWallet = await GetOrCreateWallet(ctx, session.ClinicianId, "clinician", ct);

        decimal overtimeCharged = 0m;

        if (overtimeBands > 0)
        {
            var hourlyRate = session.Clinician.HourlyRate ?? (session.Amount / BaseDurationMinutes * 60);
            var ratePerBand = Math.Round(hourlyRate / 12m, 2);
            overtimeCharged = ratePerBand * overtimeBands;

            if (patientWallet.Balance < overtimeCharged)
                overtimeCharged = patientWallet.Balance;

            patientWallet.Balance -= overtimeCharged;

            ctx.WalletTransactions.Add(new WalletTransaction
            {
                TransactionId = Guid.NewGuid(),
                WalletId = patientWallet.WalletId,
                SessionId = session.SessionId,
                TransactionType = "OvertimeDebit",
                Direction = "Debit",
                Amount = overtimeCharged,
                BalanceAfter = patientWallet.Balance,
                Description = $"Overtime {overtimeBands * 5} min",
                CreatedBy = "System_OvertimeEngine"
            });

            var clinicianOvertimeShare = Math.Round(overtimeCharged * (1 - PlatformCutPct), 2);
            clinicianWallet.Balance += clinicianOvertimeShare;

            ctx.WalletTransactions.Add(new WalletTransaction
            {
                TransactionId = Guid.NewGuid(),
                WalletId = clinicianWallet.WalletId,
                SessionId = session.SessionId,
                TransactionType = "SessionPayout",
                Direction = "Credit",
                Amount = clinicianOvertimeShare,
                BalanceAfter = clinicianWallet.Balance,
                Description = $"Overtime payout",
                CreatedBy = "System_OvertimeEngine"
            });
        }

        if (patientWallet.EscrowBalance >= session.Amount)
            patientWallet.EscrowBalance -= session.Amount;

        patientWallet.Balance -= session.Amount;
        if (patientWallet.Balance < 0m) patientWallet.Balance = 0m;

        var baseShare = Math.Round(session.Amount * (1 - PlatformCutPct), 2);
        clinicianWallet.Balance += baseShare;

        ctx.WalletTransactions.Add(new WalletTransaction
        {
            TransactionId = Guid.NewGuid(),
            WalletId = clinicianWallet.WalletId,
            SessionId = session.SessionId,
            TransactionType = "SessionPayout",
            Direction = "Credit",
            Amount = baseShare,
            BalanceAfter = clinicianWallet.Balance,
            Description = "Base session payout",
            CreatedBy = "System_SessionEnd"
        });

        session.OvertimeMinutes = overtimeBands * 5;
        session.OvertimeCharged = overtimeCharged;

        await ctx.SaveChangesAsync(ct);

        return Result<Session_EndResponse>.Success(new Session_EndResponse
        {
            SessionId = session.SessionId,
            OvertimeMinutes = session.OvertimeMinutes,
            OvertimeCharged = overtimeCharged,
            BaseAmount = session.Amount,
            TotalCharged = session.Amount + overtimeCharged,
            Message = "Session ended successfully."
        });
    }

    // ✅ FIX: Use fully qualified name to avoid ambiguity
    private async Task<Cognantic.Domain.Entities.Wallet> GetOrCreateWallet(CognanticDbContext ctx, Guid userId, string ownerType, CancellationToken ct)
    {
        var wallet = await ctx.Wallets.FirstOrDefaultAsync(w => w.UserId == userId, ct);
        if (wallet != null) return wallet;

        wallet = new Cognantic.Domain.Entities.Wallet
        {
            WalletId = Guid.NewGuid(),
            UserId = userId,
            OwnerType = ownerType,
            Balance = 0m,
            EscrowBalance = 0m,
            IsActive = true,
            CreatedTime = DateTime.UtcNow
        };

        ctx.Wallets.Add(wallet);
        return wallet;
    }
}