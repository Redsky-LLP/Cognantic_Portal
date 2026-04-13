using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Clinicians.GetProfile;

public class Clinician_GetProfileRequest : IRequest<Result<Clinician_GetProfileResponse>>
{
    /// <summary>
    /// The User.Id GUID from the JWT / localStorage.
    /// Because ClinicianId = UserId (shared primary key), this is also the ClinicianId.
    /// </summary>
    public Guid UserId { get; set; }
}