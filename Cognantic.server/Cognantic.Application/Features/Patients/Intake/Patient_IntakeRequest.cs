using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Patients.Intake;

public class Patient_IntakeRequest : IRequest<Result<Patient_IntakeResponse>>
{
    // 🔑 Pass the existing ID from the User table
    public Guid UserId { get; set; }

    // 🗑️ MRNo has been removed because the Handler auto-generates it!

    public string? Narrative { get; set; }

    public int ResilienceScore { get; set; }
}