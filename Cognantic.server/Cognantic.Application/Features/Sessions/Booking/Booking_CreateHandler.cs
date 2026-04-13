using MediatR;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.Application.Features.Sessions.Booking;

public class Booking_CreateHandler
    : IRequestHandler<Booking_CreateRequest, Result<Booking_CreateResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Booking_CreateHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Booking_CreateResponse>> Handle(
        Booking_CreateRequest request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        // 1. Validate entities
        var patient = await _context.Patients
            .FirstOrDefaultAsync(p => p.PatientId == request.PatientId, cancellationToken);

        var clinician = await _context.Clinicians
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.ClinicianId == request.ClinicianId, cancellationToken);

        if (patient == null || clinician == null)
            return Result<Booking_CreateResponse>.Failure("Invalid Patient or Clinician ID.");

        // 2. Wallet check — get or create patient wallet
        var wallet = await _context.Wallets
            .FirstOrDefaultAsync(w => w.UserId == request.PatientId, cancellationToken);

        if (wallet == null)
        {
            wallet = new Cognantic.Domain.Entities.Wallet
            {
                WalletId = Guid.NewGuid(),
                UserId = request.PatientId,
                OwnerType = "patient",
                Balance = 0m,
                EscrowBalance = 0m,
                IsActive = true,
                CreatedTime = DateTime.UtcNow,
            };
            _context.Wallets.Add(wallet);
        }

        var available = wallet.Balance - wallet.EscrowBalance;
        if (available < request.Amount)
        {
            return Result<Booking_CreateResponse>.Failure(
                $"Insufficient wallet balance. Available: ₹{available:F2}. " +
                $"Please top up ₹{(request.Amount - available):F2} more before booking.");
        }

        // 3. Hold the booking amount in escrow
        wallet.EscrowBalance += request.Amount;

        // 4. Generate confirmation code
        var code = $"CNF-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(10000, 99999)}";

        var scheduledEndTime = request.SessionDate.AddMinutes(60);

        // 5. Create the Session
        var session = new Session
        {
            SessionId = Guid.NewGuid(),
            PatientId = request.PatientId,
            ClinicianId = request.ClinicianId,
            SessionDate = request.SessionDate,
            ScheduledEndTime = scheduledEndTime,
            SessionType = request.SessionType,
            Amount = request.Amount,
            Notes = request.Notes,
            MeetLink = request.MeetLink,
            ConfirmationCode = code,
            Status = "Scheduled",
            IsActive = true,
            CreatedTime = DateTime.UtcNow,
            CreatedBy = "System_API",
        };
        _context.Sessions.Add(session);

        // 6. Log the escrow hold
        _context.WalletTransactions.Add(new Cognantic.Domain.Entities.WalletTransaction
        {
            TransactionId = Guid.NewGuid(),
            WalletId = wallet.WalletId,
            SessionId = session.SessionId,
            TransactionType = "BookingHold",
            Direction = "Debit",
            Amount = request.Amount,
            BalanceAfter = wallet.Balance - wallet.EscrowBalance,
            Description = $"Escrow hold for session on {request.SessionDate:d} with {clinician.FullName}",
            Status = "Pending",
            CreatedBy = "System_Booking",
        });

        // 7. Ensure Match row exists for the dashboard
        var matchExists = await _context.Matches.AnyAsync(
            m => m.PatientId == request.PatientId && m.ClinicianId == request.ClinicianId,
            cancellationToken);

        if (!matchExists)
        {
            _context.Matches.Add(new Match
            {
                MatchId = Guid.NewGuid(),
                PatientId = request.PatientId,
                ClinicianId = request.ClinicianId,
                MatchScore = 95,
                MatchReasons = "Booked via direct search",
                IsActive = true,
                CreatedTime = DateTime.UtcNow,
            });
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Result<Booking_CreateResponse>.Success(new Booking_CreateResponse
        {
            SessionId = session.SessionId,
            PatientId = session.PatientId,
            ClinicianId = session.ClinicianId,
            Status = session.Status,
            ScheduledAt = session.SessionDate,
            MeetLink = session.MeetLink,
            ConfirmationCode = session.ConfirmationCode,
            ClinicianName = clinician.User?.FullName ?? "Unknown Clinician",
        });
    }
}