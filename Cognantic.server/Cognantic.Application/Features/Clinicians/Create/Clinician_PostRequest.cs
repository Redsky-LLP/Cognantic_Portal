using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Clinicians.Create;

public class Clinician_PostRequest : IRequest<Result<Clinician_PostResponse>>
{
    // 🔑 Optional: Explicitly bind the pre-existing User Id from the Users table
    public Guid UserId { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? Languages { get; set; }
    public string? Credential { get; set; }
    public string? Bio { get; set; }
    public decimal HourlyRate { get; set; }
}