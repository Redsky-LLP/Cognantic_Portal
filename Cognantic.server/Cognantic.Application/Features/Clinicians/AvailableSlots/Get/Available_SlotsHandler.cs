using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Clinicians.AvailableSlots.Get
{
    public class Available_SlotsHandler : IRequestHandler<Available_SlotsRequest, Result<List<Available_SlotsResponse>>>
    {
        private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

        public Available_SlotsHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        {
            _ctxFactory = ctxFactory;
        }

        public async Task<Result<List<Available_SlotsResponse>>> Handle(Available_SlotsRequest request, CancellationToken cancellationToken)
        {
            await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

            // 1. Verify Clinician exists
            var clinicianExists = await _context.Clinicians
                .AnyAsync(c => c.ClinicianId == request.ClinicianId, cancellationToken);

            if (!clinicianExists)
            {
                return Result<List<Available_SlotsResponse>>.Failure("Clinician not found.");
            }

            // 2. Fetch existing booked sessions for this clinician in the date range
            var bookedSessions = await _context.Sessions
                .Where(s => s.ClinicianId == request.ClinicianId
                         && s.SessionDate >= request.StartDate
                         && s.SessionDate <= request.EndDate
                         && s.IsActive)
                .Select(s => s.SessionDate)
                .ToListAsync(cancellationToken);

            var slots = new List<Available_SlotsResponse>();

            // 3. Define your Working Day Constraints (e.g., 9 AM to 5 PM)
            int startHour = 9;
            int endHour = 17;

            // Loop through each day in the requested range
            for (var date = request.StartDate.Date; date <= request.EndDate.Date; date = date.AddDays(1))
            {
                // Loop through working hours for that day using 90-minute cadence
                // (60-minute session + 30-minute buffer)
                for (int minuteOffset = 0; startHour * 60 + minuteOffset + 90 <= endHour * 60; minuteOffset += 90)
                {
                    var slotStart = date.AddHours(startHour).AddMinutes(minuteOffset);
                    var slotEnd = slotStart.AddMinutes(60);   // session is 60 min
                    var bufferEnd = slotStart.AddMinutes(90); // next slot won't start until here

                    // Skip if the slot is in the past
                    if (slotStart < DateTime.UtcNow) continue;

                    // Skip if it lies outside the strict user-specified range bounds
                    if (slotStart < request.StartDate || bufferEnd > request.EndDate) continue;

                    // Booked = any session whose start falls in this 90-min block
                    bool isBooked = bookedSessions.Any(bookedTime =>
                        bookedTime >= slotStart && bookedTime < bufferEnd);

                    slots.Add(new Available_SlotsResponse
                    {
                        SlotId = Guid.NewGuid(),
                        ClinicianId = request.ClinicianId,
                        StartTime = slotStart,
                        EndTime = slotEnd, // shows patient 60-min session
                        IsBooked = isBooked
                    });
                }
            }

            return Result<List<Available_SlotsResponse>>.Success(slots);
        }
    }
}