using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Clinicians.Match;

public class Clinician_MatchesHandler
    : IRequestHandler<Clinician_MatchesRequest, Result<List<Clinician_MatchesResponse>>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Clinician_MatchesHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<List<Clinician_MatchesResponse>>> Handle(
        Clinician_MatchesRequest request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        var patientExists = await _context.Patients
            .AnyAsync(p => p.PatientId == request.PatientId, cancellationToken);

        if (!patientExists)
            return Result<List<Clinician_MatchesResponse>>.Failure("Patient record not found.");

        var cliniciansQuery = _context.Set<Clinician>()
            .Where(c => c.IsActive && c.VettingStatus == "Verified");

        if (!string.IsNullOrWhiteSpace(request.PreferredLanguage))
        {
            cliniciansQuery = cliniciansQuery.Where(c =>
                !string.IsNullOrEmpty(c.Languages) &&
                c.Languages.Contains(request.PreferredLanguage));
        }

        if (!string.IsNullOrWhiteSpace(request.SpecialtyPreference))
        {
            cliniciansQuery = cliniciansQuery.Where(c =>
                !string.IsNullOrEmpty(c.Specialty) &&
                c.Specialty.Contains(request.SpecialtyPreference));
        }

        var clinicians = await cliniciansQuery.ToListAsync(cancellationToken);

        var response = clinicians.Select(c => new Clinician_MatchesResponse
        {
            ClinicianId = c.ClinicianId,
            FullName = c.FullName,
            Specialty = c.Specialty ?? "General",
            Languages = c.Languages,
            IsAvailable = true,
            MatchScore = 95.0m,
            HourlyRate = c.HourlyRate ?? 0.0m,
            Bio = c.Bio,
            Credential = c.Credential,
            PhotoUrl = c.PhotoUrl,
        }).ToList();

        return Result<List<Clinician_MatchesResponse>>.Success(response);
    }
}