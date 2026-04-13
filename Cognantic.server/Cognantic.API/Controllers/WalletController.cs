using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Features.Wallet.TopUp;
using Cognantic.Application.Features.Wallet.Balance;
using Cognantic.Application.Features.Wallet.Withdraw;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using Result = Cognantic.Application.Common.Result;

namespace Cognantic.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class WalletController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public WalletController(IMediator mediator, IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _mediator = mediator;
        _ctxFactory = ctxFactory;
    }

    // ── POST /api/v1/Wallet/topup ─────────────────────────────────
    [HttpPost("topup")]
    public async Task<IActionResult> TopUp([FromBody] Wallet_TopUpRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Wallet/balance/{userId} ───────────────────────
    [HttpGet("balance/{userId:guid}")]
    public async Task<IActionResult> GetBalance(Guid userId)
    {
        var result = await _mediator.Send(new Wallet_BalanceRequest { UserId = userId });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── POST /api/v1/Wallet/withdraw ──────────────────────────────
    [HttpPost("withdraw")]
    public async Task<IActionResult> RequestWithdrawal([FromBody] Wallet_WithdrawRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Wallet/withdrawals/{clinicianId} ──────────────
    [HttpGet("withdrawals/{clinicianId:guid}")]
    public async Task<IActionResult> GetWithdrawals(Guid clinicianId)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var requests = await _context.WithdrawalRequests
            .Where(w => w.ClinicianId == clinicianId)
            .OrderByDescending(w => w.CreatedTime)
            .Select(w => new
            {
                w.WithdrawalId,
                w.Amount,
                w.PayoutMethod,
                w.PayoutDetails,
                w.Status,
                w.AdminNotes,
                w.ProcessedAt,
                w.GatewayReference,
                w.CreatedTime,
            })
            .ToListAsync();

        return Ok(Result<object>.Success(requests));
    }

    // ── POST /api/v1/Wallet/admin/approve-withdrawal ──────────────
    [HttpPost("admin/approve-withdrawal")]
    public async Task<IActionResult> ApproveWithdrawal([FromBody] ApproveWithdrawalRequest body)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var withdrawal = await _context.WithdrawalRequests
            .FirstOrDefaultAsync(w => w.WithdrawalId == body.WithdrawalId);

        if (withdrawal == null)
            return NotFound(Result<bool>.Failure("Withdrawal request not found."));

        if (withdrawal.Status != "Pending")
            return BadRequest(Result<bool>.Failure($"Request is already {withdrawal.Status}."));

        var clinicianWallet = await _context.Wallets
            .FirstOrDefaultAsync(w => w.UserId == withdrawal.ClinicianId);

        if (clinicianWallet == null)
            return BadRequest(Result<bool>.Failure("Clinician wallet not found."));

        if (body.Approved)
        {
            // --- APPROVE PATH ---
            // 1. Validate actual balance
            if (clinicianWallet.Balance < withdrawal.Amount)
                return BadRequest(Result<bool>.Failure("Clinician wallet has insufficient balance."));

            // 2. Debit the main balance
            clinicianWallet.Balance -= withdrawal.Amount;

            // 3. Release the escrow hold
            clinicianWallet.EscrowBalance = Math.Max(0, clinicianWallet.EscrowBalance - withdrawal.Amount);

            // 4. Log the debit transaction
            _context.WalletTransactions.Add(new Domain.Entities.WalletTransaction
            {
                TransactionId = Guid.NewGuid(),
                WalletId = clinicianWallet.WalletId,
                TransactionType = "Withdrawal",
                Direction = "Debit",
                Amount = withdrawal.Amount,
                BalanceAfter = clinicianWallet.Balance,
                Description = $"Payout approved by admin via {withdrawal.PayoutMethod}",
                Status = "Completed",
                CreatedBy = body.ApprovedBy ?? "Admin",
            });

            withdrawal.Status = "Transferred";
        }
        else
        {
            // --- REJECT PATH ---
            // 1. Release the escrow (moves back to available mentally, though technically it stays in Balance)
            clinicianWallet.EscrowBalance = Math.Max(0, clinicianWallet.EscrowBalance - withdrawal.Amount);

            // 2. Log a record that it was rejected (No debit to Balance occurs)
            _context.WalletTransactions.Add(new Domain.Entities.WalletTransaction
            {
                TransactionId = Guid.NewGuid(),
                WalletId = clinicianWallet.WalletId,
                TransactionType = "Withdrawal",
                Direction = "Credit", // Escrow release is effectively a credit back to "Available"
                Amount = withdrawal.Amount,
                BalanceAfter = clinicianWallet.Balance, // Balance remains unchanged
                Description = $"Withdrawal request rejected by admin — escrow released",
                Status = "Rejected",
                CreatedBy = body.ApprovedBy ?? "Admin",
            });

            withdrawal.Status = "Rejected";
        }

        // --- Common Fields Update ---
        withdrawal.AdminNotes = body.AdminNotes;
        withdrawal.ProcessedAt = DateTime.UtcNow;
        withdrawal.ProcessedBy = body.ApprovedBy;
        withdrawal.GatewayReference = body.GatewayReference;

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(Result<bool>.Success(true,
            body.Approved ? "Withdrawal approved and transferred." : "Withdrawal rejected."));
    }
}

public class ApproveWithdrawalRequest
{
    public Guid WithdrawalId { get; set; }
    public bool Approved { get; set; }
    public string? AdminNotes { get; set; }
    public string? ApprovedBy { get; set; }
    public string? GatewayReference { get; set; }
}