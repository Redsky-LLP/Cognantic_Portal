namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ActionResponse
{
    public Guid ClinicianId { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ActionDate { get; set; }
    public string? AdminNotes { get; set; } // Added: To display reason in UI
}