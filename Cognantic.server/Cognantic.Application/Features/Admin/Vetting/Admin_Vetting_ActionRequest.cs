using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ActionRequest : IRequest<Result<Admin_Vetting_ActionResponse>>
{
    public Guid ClinicianId { get; set; }
    public string Action { get; set; } = string.Empty; // "Approve" or "Reject"
    public string? Reason { get; set; }
}