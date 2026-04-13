using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using Cognantic.Domain.Entities;

namespace Cognantic.Application.Features.Patients.Dashboard
{
    public class Patient_DashboardHandler : IRequestHandler<Patient_DashboardRequest, Result<Patient_DashboardResponse>>
    {
        private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

        public Patient_DashboardHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        {
            _ctxFactory = ctxFactory;
        }

        public async Task<Result<Patient_DashboardResponse>> Handle(Patient_DashboardRequest request, CancellationToken cancellationToken)
        {
            await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

            var patientData = await _context.Patients
                .Include(p => p.User)
                .Include(p => p.Matches)
                    .ThenInclude(m => m.Clinician)
                .FirstOrDefaultAsync(p => p.PatientId == request.PatientId, cancellationToken);

            if (patientData == null)
            {
                return Result<Patient_DashboardResponse>.Failure("Patient profile not found.");
            }

            var response = new Patient_DashboardResponse
            {
                PatientId = patientData.PatientId,
                FullName = patientData.User.FullName,
                MRNo = patientData.MRNo,
                ResilienceScore = patientData.ResilienceScore,
                ActiveMatches = patientData.Matches.Select(m => new MatchedClinicianDto
                {
                    ClinicianId = m.ClinicianId,
                    FullName = m.Clinician.FullName,
                    Specialty = m.Clinician.Specialty ?? "General",
                    MatchStatus = "Active"
                }).ToList(),
                TotalSessions = await _context.Set<Domain.Entities.Session>()
                    .CountAsync(s => s.PatientId == request.PatientId, cancellationToken)
            };

            return Result<Patient_DashboardResponse>.Success(response);
        }
    }
}