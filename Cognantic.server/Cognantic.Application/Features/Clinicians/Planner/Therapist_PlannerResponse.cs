namespace Cognantic.Application.Features.Clinicians.Planner;

public class Therapist_PlannerResponse
{
    public Guid ClinicianId { get; set; }
    public string ClinicianName { get; set; } = string.Empty;
    public List<PlannedSessionDto> DailySessions { get; set; } = new();
    public int TotalMinutesBooked { get; set; }
    public int? DayRating { get; set; } // Added: For therapist wellness tracking
}

public class PlannedSessionDto
{
    public Guid SessionId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string MRNo { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public string SessionType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? MeetLink { get; set; }   // ← add this line only
}