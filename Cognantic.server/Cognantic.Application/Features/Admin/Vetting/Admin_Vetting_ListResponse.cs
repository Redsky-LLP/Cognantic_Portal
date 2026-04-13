namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ListResponse
{
    public Guid ClinicianId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty; // Added: For admin contact info
    public string Specialty { get; set; } = string.Empty;
    public string VettingStatus { get; set; } = string.Empty;
    public string Credential { get; set; } = string.Empty;
    public DateTime CreatedTime { get; set; }
    public bool IsActive { get; set; }
}