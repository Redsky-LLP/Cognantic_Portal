namespace Cognantic.Application.Features.Admin.ManualOnboard;

public class Admin_ManualOnboard_Response
{
    public Guid ClinicianId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string VettingStatus { get; set; } = string.Empty;
    public DateTime CreatedTime { get; set; }
    public string TempPassword { get; set; } = string.Empty; // ✅ NEW — show in Admin UI
}