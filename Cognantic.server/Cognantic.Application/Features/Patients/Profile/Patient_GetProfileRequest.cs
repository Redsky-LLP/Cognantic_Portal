using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Patients.Profile;

public class Patient_GetProfileRequest : IRequest<Result<Patient_GetProfileResponse>>
{
    public Guid UserId { get; set; }
}

public class Patient_GetProfileResponse
{
    public Guid PatientId { get; set; }
    public string MrNo { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int ResilienceScore { get; set; }
    public DateTime CreatedAt { get; set; }
}