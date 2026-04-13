namespace Cognantic.Application.Features.Patients.Dashboard;

public class Patient_DashboardResponse
{
    public Guid PatientId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string MRNo { get; set; } = string.Empty;
    public int ResilienceScore { get; set; }
    public List<MatchedClinicianDto> ActiveMatches { get; set; } = new();
    public int TotalSessions { get; set; }
}

public class MatchedClinicianDto
{
    public Guid ClinicianId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string MatchStatus { get; set; } = string.Empty;
}