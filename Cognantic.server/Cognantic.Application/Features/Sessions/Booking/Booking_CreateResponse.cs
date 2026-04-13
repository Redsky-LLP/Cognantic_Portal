namespace Cognantic.Application.Features.Sessions.Booking;

public class Booking_CreateResponse
{
    public Guid SessionId { get; set; }
    public Guid PatientId { get; set; }
    public Guid ClinicianId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime ScheduledAt { get; set; }

    /// <summary>
    /// Zoom / Google Meet URL. Shown on the patient confirmation screen
    /// and in the Upcoming Sessions section of the dashboard.
    /// </summary>
    public string? MeetLink { get; set; }

    /// <summary>
    /// Auto-generated code e.g. "CNF-20260328-49930".
    /// Shown on the patient confirmation screen.
    /// </summary>
    public string? ConfirmationCode { get; set; }

    /// <summary>
    /// Clinician's display name — needed by the frontend to render
    /// the confirmation card without a second API call.
    /// </summary>
    public string ClinicianName { get; set; } = string.Empty;
}