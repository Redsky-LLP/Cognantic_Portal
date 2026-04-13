using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Clinicians.Match;

public class Clinician_MatchesRequest : IRequest<Result<List<Clinician_MatchesResponse>>>
{
    public Guid PatientId { get; set; }
    public string? SpecialtyPreference { get; set; }

    // 👇 Added: Expose this to your HTTP Endpoints and MediatR Handlers
    public string? PreferredLanguage { get; set; }
}