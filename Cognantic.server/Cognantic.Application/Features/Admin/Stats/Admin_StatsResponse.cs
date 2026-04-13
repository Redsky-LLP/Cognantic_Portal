namespace Cognantic.Application.Features.Admin.Stats;

public class Admin_StatsResponse
{
    public int TotalPatients { get; set; }
    public int TotalClinicians { get; set; }
    public int ScheduledSessions { get; set; }
    public decimal TotalRevenue { get; set; }
    public double AverageResilienceScore { get; set; }
    public List<RecentActivityDto> RecentActivities { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow; // Added: For UI timestamp
}

public class RecentActivityDto
{
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Type { get; set; } = string.Empty; // e.g., "Booking", "Intake"
}