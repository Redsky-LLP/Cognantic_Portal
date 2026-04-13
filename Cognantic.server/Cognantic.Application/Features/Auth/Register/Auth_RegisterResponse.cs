using Cognantic.Application.Features.Auth.Login;

namespace Cognantic.Application.Features.Auth.Register;

public class Auth_RegisterResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;

    // 🟢 Added to match LoginResponse and support therapist/patient workflows
    public Guid? PatientId { get; set; }
    public Guid? ClinicianId { get; set; }
    public string? VettingStatus { get; set; }
    public string? RejectionReason { get; set; }

    public UserProfile User { get; set; } = new();
}