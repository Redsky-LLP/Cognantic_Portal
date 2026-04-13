using MediatR;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.Application.Features.Admin.ManualOnboard;

/// <summary>
/// Creates both the User and Clinician rows simultaneously using a shared Guid,
/// sets VettingStatus directly to "Verified", and — FIX #5 — also creates the
/// clinician's Wallet row so they can receive session payouts immediately.
/// </summary>
public class Admin_ManualOnboard_Handler
    : IRequestHandler<Admin_ManualOnboard_Request, Result<Admin_ManualOnboard_Response>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Admin_ManualOnboard_Handler(IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _ctxFactory = ctxFactory;
    }

    public async Task<Result<Admin_ManualOnboard_Response>> Handle(
        Admin_ManualOnboard_Request request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        // ── Guard: Prevent duplicate email entries ───────────────────
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == request.Email, cancellationToken);

        if (emailExists)
        {
            return Result<Admin_ManualOnboard_Response>.Failure(
                $"A user with email '{request.Email}' already exists in the system.");
        }

        // ── Generate a shared ID for all related tables ──────────────
        // This Guid serves as User.Id, Clinician.ClinicianId, and Wallet.UserId
        var sharedId = Guid.NewGuid();

        // ── Generate Temporary Credentials ───────────────────────────
        // Generate a random 8-character temp password for initial login
        var tempPassword = $"Temp@{Guid.NewGuid().ToString("N")[..8]}";

        // ── 1. Create the Shadow User (The Parent) ───────────────────
        var user = new User
        {
            Id = sharedId,
            FullName = request.FullName,
            Email = request.Email,
            Role = "therapist", // Matches the role used in UI and Authorization
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword, workFactor: 12),
            IsActive = true,
            CreatedTime = DateTime.UtcNow,
            CreatedBy = "Admin_ManualOnboard"
        };

        // ── 2. Create the Clinician record (The Child) ───────────────
        var clinician = new Clinician
        {
            ClinicianId = sharedId, // Must match User.Id (FK)
            FullName = request.FullName,
            Email = request.Email,
            Specialty = request.Specialty,
            Languages = request.Languages,
            Credential = request.Credential,
            Bio = request.Bio,
            HourlyRate = request.HourlyRate,

            // 🔑 Admin bypass: skip 'Pending' status and set to 'Verified'
            VettingStatus = "Verified",

            IsActive = true,
            CreatedTime = DateTime.UtcNow,
            CreatedBy = "Admin_ManualOnboard"
        };

        // ── 3. FIX #5: Create Clinician Wallet (The Account) ─────────
        // We create this eagerly so payout/withdrawal queries work immediately 
        // without waiting for the first session to end.
        // Change line 82 to use the full path:
        var clinicianWallet = new Cognantic.Domain.Entities.Wallet
        {
            WalletId = Guid.NewGuid(),
            UserId = sharedId,
            OwnerType = "clinician",
            Balance = 0m,
            EscrowBalance = 0m,
            IsActive = true,
            CreatedTime = DateTime.UtcNow,
        };

        // ── Persistence ──────────────────────────────────────────────
        // Add all entities to context. EF Core will resolve the insertion order 
        // (User first, then Clinician/Wallet) to satisfy Foreign Key constraints.
        _context.Users.Add(user);
        _context.Clinicians.Add(clinician);
        _context.Wallets.Add(clinicianWallet);

        // Atomic transaction
        await _context.SaveChangesAsync(CancellationToken.None);

        return Result<Admin_ManualOnboard_Response>.Success(new Admin_ManualOnboard_Response
        {
            ClinicianId = clinician.ClinicianId,
            FullName = clinician.FullName,
            Email = clinician.Email,
            VettingStatus = clinician.VettingStatus,
            CreatedTime = clinician.CreatedTime,
            TempPassword = tempPassword,
        });
    }
}