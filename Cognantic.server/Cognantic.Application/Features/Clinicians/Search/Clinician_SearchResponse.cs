namespace Cognantic.Application.Features.Clinicians.Search;

public class Clinician_SearchResponse
{
    public Guid ClinicianId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? Languages { get; set; } // 👈 Add this field
    public string? Credential { get; set; }
    public string? Bio { get; set; }
    public decimal HourlyRate { get; set; }
    public double Rating { get; set; }
}