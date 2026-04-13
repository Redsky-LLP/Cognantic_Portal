using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Sessions.Booking;

public class Booking_CreateRequest : IRequest<Result<Booking_CreateResponse>>
{
    public Guid PatientId { get; set; }
    public Guid ClinicianId { get; set; }
    public DateTime SessionDate { get; set; }
    public string? SessionType { get; set; }
    public decimal Amount { get; set; }
    public string? Notes { get; set; }
    public string? MeetLink { get; set; }
}