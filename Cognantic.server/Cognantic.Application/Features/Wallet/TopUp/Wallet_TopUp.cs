using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Wallet.TopUp;

public class Wallet_TopUpRequest : IRequest<Result<Wallet_TopUpResponse>>
{
    public string UserId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "UPI";
    public string? GatewayReference { get; set; }
}

public class Wallet_TopUpResponse
{
    public Guid WalletId { get; set; }
    public decimal NewBalance { get; set; }
    public Guid TransactionId { get; set; }
}

public class Wallet_TopUpHandler : IRequestHandler<Wallet_TopUpRequest, Result<Wallet_TopUpResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Wallet_TopUpHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Wallet_TopUpResponse>> Handle(Wallet_TopUpRequest req, CancellationToken ct)
    {
        Console.WriteLine("=== WALLET TOP-UP STARTED ===");
        Console.WriteLine($"UserId: {req.UserId}, Amount: {req.Amount}");

        // 1. Validation
        if (req.Amount <= 0)
            return Result<Wallet_TopUpResponse>.Failure("Top-up amount must be greater than zero.");

        if (!Guid.TryParse(req.UserId, out var userGuid))
            return Result<Wallet_TopUpResponse>.Failure("Invalid User ID format.");

        Console.WriteLine($"Parsed UserId: {userGuid}");

        // 2. Safe Context Initialization
        await using var ctx = await _ctxFactory.CreateDbContextAsync(ct);
        Console.WriteLine("DbContext created successfully");

        try
        {
            // 3. Verify User
            Console.WriteLine("Looking up user...");
            var user = await ctx.Users.FirstOrDefaultAsync(u => u.Id == userGuid, ct);
            if (user == null)
                return Result<Wallet_TopUpResponse>.Failure($"User not found for ID: {userGuid}");

            Console.WriteLine($"User found: {user.Email}, Role: {user.Role}");

            string ownerType = user.Role.ToLower() == "therapist" ? "clinician" : "patient";
            string createdByLabel = ownerType == "clinician" ? "Clinician" : "Patient";

            // 4. Find or Create Wallet
            Console.WriteLine("Looking up wallet...");
            var wallet = await ctx.Wallets.FirstOrDefaultAsync(w => w.UserId == userGuid, ct);

            if (wallet == null)
            {
                Console.WriteLine("Wallet not found, creating new wallet...");
                wallet = new Cognantic.Domain.Entities.Wallet
                {
                    WalletId = Guid.NewGuid(),
                    UserId = userGuid,
                    OwnerType = ownerType,
                    Balance = 0m,
                    EscrowBalance = 0m,
                    IsActive = true,
                    CreatedTime = DateTime.UtcNow
                };
                ctx.Wallets.Add(wallet);
                await ctx.SaveChangesAsync(ct);
                Console.WriteLine($"Wallet created with ID: {wallet.WalletId}");
                wallet = await ctx.Wallets.FirstAsync(w => w.UserId == userGuid, ct);
            }

            Console.WriteLine($"Wallet found. Current balance: {wallet.Balance}");

            // 5. Update Balance
            wallet.Balance += req.Amount;
            Console.WriteLine($"New balance after top-up: {wallet.Balance}");

            // 6. Record Transaction
            var txId = Guid.NewGuid();
            var tx = new WalletTransaction
            {
                TransactionId = txId,
                WalletId = wallet.WalletId,
                TransactionType = "TopUp",
                Direction = "Credit",
                Amount = req.Amount,
                BalanceAfter = wallet.Balance,
                Description = $"Top-up via {req.PaymentMethod}" +
                              (!string.IsNullOrEmpty(req.GatewayReference) ? $" | Ref: {req.GatewayReference}" : ""),
                Status = "Completed",
                CreatedTime = DateTime.UtcNow,
                CreatedBy = createdByLabel
            };

            ctx.WalletTransactions.Add(tx);
            Console.WriteLine("Transaction record created, saving to database...");

            // 7. Atomic Save
            await ctx.SaveChangesAsync(ct);
            Console.WriteLine("Save completed successfully!");

            return Result<Wallet_TopUpResponse>.Success(new Wallet_TopUpResponse
            {
                WalletId = wallet.WalletId,
                NewBalance = wallet.Balance,
                TransactionId = txId
            });
        }
        catch (DbUpdateException ex)
        {
            Console.WriteLine("=== DB UPDATE EXCEPTION ===");
            Console.WriteLine($"Message: {ex.Message}");
            Console.WriteLine($"Inner: {ex.InnerException?.Message}");
            Console.WriteLine($"Inner Inner: {ex.InnerException?.InnerException?.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            Console.WriteLine("==========================");

            var inner = ex.InnerException?.Message ?? "No inner exception details available.";
            return Result<Wallet_TopUpResponse>.Failure($"Database save failed: {inner}");
        }
        catch (Exception ex)
        {
            Console.WriteLine("=== GENERAL EXCEPTION ===");
            Console.WriteLine($"Type: {ex.GetType().FullName}");
            Console.WriteLine($"Message: {ex.Message}");
            Console.WriteLine($"Inner: {ex.InnerException?.Message}");
            Console.WriteLine($"Stack: {ex.StackTrace}");
            Console.WriteLine("========================");

            return Result<Wallet_TopUpResponse>.Failure($"Unexpected error: {ex.Message}");
        }
        finally
        {
            Console.WriteLine("=== WALLET TOP-UP ENDED ===");
        }
    }
}