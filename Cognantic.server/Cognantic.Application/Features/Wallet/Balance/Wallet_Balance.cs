using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Wallet.Balance;

// Request class
public class Wallet_BalanceRequest : IRequest<Result<Wallet_BalanceResponse>>
{
    public Guid UserId { get; set; }
}

// Response class
public class Wallet_BalanceResponse
{
    public Guid WalletId { get; set; }
    public decimal Balance { get; set; }
    public decimal EscrowBalance { get; set; }
    public decimal Available { get; set; }
    public List<Wallet_TransactionDto> RecentTransactions { get; set; } = new();
}

// DTO class
public class Wallet_TransactionDto
{
    public Guid TransactionId { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public string Direction { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal BalanceAfter { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedTime { get; set; }
}

// Handler
public class Wallet_BalanceHandler : IRequestHandler<Wallet_BalanceRequest, Result<Wallet_BalanceResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Wallet_BalanceHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Wallet_BalanceResponse>> Handle(Wallet_BalanceRequest req, CancellationToken ct)
    {
        await using var _ctx = await _ctxFactory.CreateDbContextAsync(ct);

        var response = await _ctx.Wallets
            .Where(w => w.UserId == req.UserId)
            .Select(w => new Wallet_BalanceResponse
            {
                WalletId = w.WalletId,
                Balance = w.Balance,
                EscrowBalance = w.EscrowBalance,
                Available = w.Balance - w.EscrowBalance,
                RecentTransactions = w.Transactions
                    .OrderByDescending(t => t.CreatedTime)
                    .Take(20)
                    .Select(t => new Wallet_TransactionDto
                    {
                        TransactionId = t.TransactionId,
                        TransactionType = t.TransactionType,
                        Direction = t.Direction,
                        Amount = t.Amount,
                        BalanceAfter = t.BalanceAfter,
                        Description = t.Description,
                        CreatedTime = t.CreatedTime
                    }).ToList()
            })
            .FirstOrDefaultAsync(ct);

        if (response == null)
        {
            return Result<Wallet_BalanceResponse>.Success(new Wallet_BalanceResponse
            {
                Balance = 0m,
                EscrowBalance = 0m,
                Available = 0m,
                RecentTransactions = new List<Wallet_TransactionDto>()
            });
        }

        return Result<Wallet_BalanceResponse>.Success(response);
    }
}