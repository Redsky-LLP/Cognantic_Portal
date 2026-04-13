using MediatR;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.Application.Features.Clinicians.Create;

public class Clinician_PostHandler : IRequestHandler<Clinician_PostRequest, Result<Clinician_PostResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    // ✅ FIX: Use IDbContextFactory instead of CognanticDbContext directly.
    //
    // The injected CognanticDbContext (scoped bridge) shares its underlying
    // Npgsql connection with the request scope. When the Wallet INSERT tries
    // to read back the xmin concurrency token, the Session Pooler (PgBouncer)
    // has already recycled that connection, causing:
    //   ObjectDisposedException: Cannot access a disposed object.
    //   Object name: 'System.Threading.ManualResetEventSlim'
    //
    // Creating our own context via the factory gives this handler a dedicated
    // connection that we fully control and dispose in the finally block.
    public Clinician_PostHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _ctxFactory = ctxFactory;
    }

    public async Task<Result<Clinician_PostResponse>> Handle(
        Clinician_PostRequest request,
        CancellationToken cancellationToken)
    {
        var ctx = await _ctxFactory.CreateDbContextAsync(CancellationToken.None);

        try
        {
            // 1. Verify the User exists in the Users table
            var user = await ctx.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email, CancellationToken.None);

            if (user == null)
                return Result<Clinician_PostResponse>.Failure(
                    "No registered user found with this email. Please register the account first.");

            // 2. Guard: prevent duplicate clinician profiles
            var exists = await ctx.Clinicians
                .AnyAsync(c => c.ClinicianId == user.Id, CancellationToken.None);

            if (exists)
                return Result<Clinician_PostResponse>.Failure(
                    "A clinician profile is already onboarded for this account.");

            // 3. Build the Clinician entity
            var clinician = new Clinician
            {
                ClinicianId = user.Id,   // shared PK — same as Users.Id (1:1)
                FullName = request.FullName,
                Email = request.Email,
                Specialty = request.Specialty,
                Languages = request.Languages,
                Credential = request.Credential,
                Bio = request.Bio,
                HourlyRate = request.HourlyRate,
                VettingStatus = "Pending",
                IsActive = true,
                CreatedTime = DateTime.UtcNow,
                CreatedBy = "System_Onboarding"
            };

            ctx.Clinicians.Add(clinician);

            // ✅ FIX: Save the Clinician row FIRST — on its own SaveChanges.
            //
            // The Wallet entity has xmin as a concurrency token
            // (ValueGeneratedOnAddOrUpdate). If we insert Clinician + Wallet
            // in a single SaveChangesAsync, EF Core must read back xmin for the
            // new Wallet row in the same round-trip. The Session Pooler recycles
            // the physical connection between those two operations, disposing the
            // ManualResetEventSlim Npgsql uses internally → crash.
            //
            // Saving Clinician first commits it safely (no xmin on Clinician),
            // then we create and save the Wallet in a second round-trip where
            // the connection is fresh and xmin can be read back cleanly.
            await ctx.SaveChangesAsync(CancellationToken.None);

            // 4. Now create the Clinician's wallet in a separate save
            var clinicianWallet = new Cognantic.Domain.Entities.Wallet
            {
                WalletId = Guid.NewGuid(),
                UserId = user.Id,
                OwnerType = "clinician",
                Balance = 0m,
                EscrowBalance = 0m,
                IsActive = true,
                CreatedTime = DateTime.UtcNow,
            };

            ctx.Wallets.Add(clinicianWallet);
            await ctx.SaveChangesAsync(CancellationToken.None);

            return Result<Clinician_PostResponse>.Success(new Clinician_PostResponse
            {
                ClinicianId = clinician.ClinicianId,
                VettingStatus = clinician.VettingStatus,
                CreatedTime = clinician.CreatedTime
            });
        }
        catch (DbUpdateException ex)
        {
            var inner = ex.InnerException?.Message ?? "no inner exception";
            var inner2 = ex.InnerException?.InnerException?.Message ?? "";
            var detail = string.IsNullOrEmpty(inner2) ? inner : $"{inner} → {inner2}";
            return Result<Clinician_PostResponse>.Failure($"Database save failed: {detail}");
        }
        catch (Exception ex)
        {
            return Result<Clinician_PostResponse>.Failure($"Unexpected error: {ex.Message}");
        }
        finally
        {
            ctx.Dispose();
        }
    }
}