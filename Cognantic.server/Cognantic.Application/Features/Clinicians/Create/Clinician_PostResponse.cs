namespace Cognantic.Application.Features.Clinicians.Create;

public class Clinician_PostResponse
{
    public Guid ClinicianId { get; set; }
    public string VettingStatus { get; set; } = string.Empty;
    public DateTime CreatedTime { get; set; }
}