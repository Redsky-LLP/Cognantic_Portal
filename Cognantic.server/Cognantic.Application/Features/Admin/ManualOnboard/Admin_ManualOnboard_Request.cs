using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Admin.ManualOnboard;

/// <summary>
/// Admin-only command to create a Clinician row directly in [Cognantic].[Clinicians]
/// with VettingStatus = "Verified", bypassing the base [Users] table registration.
/// The Clinician gets a fresh Guid as their ClinicianId (no matching User row required).
/// </summary>
public class Admin_ManualOnboard_Request : IRequest<Result<Admin_ManualOnboard_Response>>
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? Languages { get; set; }
    public string? Credential { get; set; }
    public string? Bio { get; set; }
    public decimal HourlyRate { get; set; }
}