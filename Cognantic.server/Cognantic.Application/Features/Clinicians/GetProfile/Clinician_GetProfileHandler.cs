using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Clinicians.GetProfile;

public class Clinician_GetProfileHandler
    : IRequestHandler<Clinician_GetProfileRequest, Result<Clinician_GetProfileResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Clinician_GetProfileHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Clinician_GetProfileResponse>> Handle(
        Clinician_GetProfileRequest request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        var clinician = await _context.Clinicians
            .FirstOrDefaultAsync(c => c.ClinicianId == request.UserId, cancellationToken);

        if (clinician == null)
            return Result<Clinician_GetProfileResponse>.Failure(
                "No clinician profile found for this user.");

        return Result<Clinician_GetProfileResponse>.Success(new Clinician_GetProfileResponse
        {
            ClinicianId = clinician.ClinicianId,
            FullName = clinician.FullName,
            Email = clinician.Email ?? string.Empty,
            Specialty = clinician.Specialty ?? string.Empty,
            Languages = clinician.Languages,
            Credential = clinician.Credential,
            Bio = clinician.Bio,
            HourlyRate = clinician.HourlyRate,
            VettingStatus = clinician.VettingStatus ?? "Pending",
            RejectionReason = clinician.RejectionReason,
            IsActive = clinician.IsActive,
            CreatedTime = clinician.CreatedTime,
        });
    }
}