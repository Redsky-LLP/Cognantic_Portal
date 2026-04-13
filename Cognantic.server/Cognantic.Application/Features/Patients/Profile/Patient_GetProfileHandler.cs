using MediatR;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.Application.Features.Patients.Profile;

public class Patient_GetProfileHandler
    : IRequestHandler<Patient_GetProfileRequest, Result<Patient_GetProfileResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Patient_GetProfileHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Patient_GetProfileResponse>> Handle(
        Patient_GetProfileRequest request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        // Use PatientId instead of UserId, as they are the same in your 1-to-1 mapping
        var patient = await _context.Patients
            .Include(p => p.User)
            .FirstOrDefaultAsync(p => p.PatientId == request.UserId, cancellationToken);

        if (patient == null)
            return Result<Patient_GetProfileResponse>.Failure("Patient profile not found.");

        return Result<Patient_GetProfileResponse>.Success(new Patient_GetProfileResponse
        {
            PatientId = patient.PatientId,
            MrNo = patient.MRNo,
            FullName = patient.User?.FullName ?? "Unknown",
            ResilienceScore = patient.ResilienceScore,
            CreatedAt = patient.CreatedTime
        });
    }
}