namespace Cognantic.Application.Features.Clinicians.AvailableSlots.Get;

public class Available_SlotsResponse
{
    public Guid SlotId { get; set; }
    public Guid ClinicianId { get; set; } // Added: To maintain context in the UI
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public bool IsBooked { get; set; }
}