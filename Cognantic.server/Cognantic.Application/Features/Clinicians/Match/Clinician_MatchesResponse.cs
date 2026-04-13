// PATH: Cognantic.Application/Features/Clinicians/Match/Clinician_MatchesResponse.cs
//
// FIX (Bug 5): Added PhotoUrl so the patient finder card can display
// the clinician's profile photo.

namespace Cognantic.Application.Features.Clinicians.Match;

public class Clinician_MatchesResponse
{
    public Guid ClinicianId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? Languages { get; set; }
    public decimal MatchScore { get; set; }
    public bool IsAvailable { get; set; }
    public decimal HourlyRate { get; set; }

    // Rich profile card fields
    public string? Bio { get; set; }
    public string? Credential { get; set; }

    // ✅ FIX (Bug 5): Profile photo URL — null triggers initials fallback in Avatar
    public string? PhotoUrl { get; set; }
}