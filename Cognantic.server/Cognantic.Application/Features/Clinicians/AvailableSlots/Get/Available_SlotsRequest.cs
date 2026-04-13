using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Clinicians.AvailableSlots.Get;

public class Available_SlotsRequest : IRequest<Result<List<Available_SlotsResponse>>>
{
    public Guid ClinicianId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}