using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Admin.Stats;

public class Admin_StatsRequest : IRequest<Result<Admin_StatsResponse>>
{
    // Typically empty for a general dashboard, or could include a DateRange
    public DateTime? FromDate { get; set; }
}