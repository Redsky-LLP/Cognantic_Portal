using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using Cognantic.Domain.Entities;

namespace Cognantic.Application.Features.Clinicians.Planner
{
    public class Therapist_PlannerHandler : IRequestHandler<Therapist_PlannerRequest, Result<Therapist_PlannerResponse>>
    {
        private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

        public Therapist_PlannerHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        {
            _ctxFactory = ctxFactory;
        }

        public async Task<Result<Therapist_PlannerResponse>> Handle(Therapist_PlannerRequest request, CancellationToken cancellationToken)
        {
            await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

            var clinician = await _context.Clinicians
                .FirstOrDefaultAsync(c => c.ClinicianId == request.ClinicianId, cancellationToken);

            if (clinician == null)
                return Result<Therapist_PlannerResponse>.Failure("Clinician not found.");

            var sessions = await _context.Sessions
                .Include(s => s.Patient)
                    .ThenInclude(p => p.User)
                .Where(s => s.ClinicianId == request.ClinicianId
                         && s.SessionDate.Date == request.ViewDate.Date
                         && s.IsActive)
                .OrderBy(s => s.SessionDate)
                .ToListAsync(cancellationToken);

            var response = new Therapist_PlannerResponse
            {
                ClinicianId = clinician.ClinicianId,
                ClinicianName = clinician.FullName ?? "Therapist",
                DailySessions = sessions.Select(s => new PlannedSessionDto
                {
                    SessionId = s.SessionId,
                    PatientName = s.Patient?.User?.FullName ?? "Unknown Patient",
                    MRNo = s.Patient?.MRNo ?? "N/A",
                    StartTime = s.SessionDate,
                    SessionType = s.SessionType ?? "General",
                    Status = s.Status,
                    MeetLink = s.MeetLink,
                }).ToList(),
                TotalMinutesBooked = sessions.Count * 50
            };

            return Result<Therapist_PlannerResponse>.Success(response);
        }
    }
}