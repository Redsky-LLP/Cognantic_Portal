using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Wallet.Withdraw;

// Request class
public class Wallet_WithdrawRequest : IRequest<Result<Wallet_WithdrawResponse>>
{
    public Guid ClinicianId { get; set; }
    public decimal Amount { get; set; }
    public string PayoutMethod { get; set; } = "UPI";
    public string PayoutDetails { get; set; } = string.Empty;
}

// Response class
public class Wallet_WithdrawResponse
{
    public Guid WithdrawalId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

// Handler
public class Wallet_WithdrawHandler : IRequestHandler<Wallet_WithdrawRequest, Result<Wallet_WithdrawResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Wallet_WithdrawHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Wallet_WithdrawResponse>> Handle(Wallet_WithdrawRequest req, CancellationToken ct)
    {
        await using var _ctx = await _ctxFactory.CreateDbContextAsync(ct);

        if (req.Amount <= 0)
            return Result<Wallet_WithdrawResponse>.Failure("Withdrawal amount must be greater than zero.");

        if (string.IsNullOrWhiteSpace(req.PayoutDetails))
            return Result<Wallet_WithdrawResponse>.Failure("Payout details are required.");

        var wallet = await _ctx.Wallets.FirstOrDefaultAsync(w => w.UserId == req.ClinicianId, ct);

        if (wallet == null || wallet.Balance < req.Amount)
            return Result<Wallet_WithdrawResponse>.Failure($"Insufficient balance. Available: ₹{wallet?.Balance ?? 0m}");

        wallet.EscrowBalance += req.Amount;

        var withdrawal = new WithdrawalRequest
        {
            WithdrawalId = Guid.NewGuid(),
            ClinicianId = req.ClinicianId,
            Amount = req.Amount,
            PayoutMethod = req.PayoutMethod,
            PayoutDetails = req.PayoutDetails,
            Status = "Pending",
        };
        _ctx.WithdrawalRequests.Add(withdrawal);

        _ctx.WalletTransactions.Add(new WalletTransaction
        {
            TransactionId = Guid.NewGuid(),
            WalletId = wallet.WalletId,
            TransactionType = "Withdrawal",
            Direction = "Debit",
            Amount = req.Amount,
            BalanceAfter = wallet.Balance - req.Amount,
            Description = $"Withdrawal request via {req.PayoutMethod} — pending approval",
            Status = "Pending",
            CreatedBy = "Clinician",
        });

        await _ctx.SaveChangesAsync(CancellationToken.None);

        return Result<Wallet_WithdrawResponse>.Success(new Wallet_WithdrawResponse
        {
            WithdrawalId = withdrawal.WithdrawalId,
            Amount = withdrawal.Amount,
            Status = "Pending",
            Message = "Withdrawal request submitted for approval.",
        });
    }
}