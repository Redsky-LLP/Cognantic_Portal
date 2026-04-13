using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ListRequest : IRequest<Result<List<Admin_Vetting_ListResponse>>>
{
    public string? StatusFilter { get; set; } // e.g., "Pending", "Rejected"
}