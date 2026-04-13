namespace Cognantic.Application.Features.Patients.Intake;

public class Patient_IntakeResponse
{
    public Guid Id { get; set; }
    public string MRNo { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; }
}