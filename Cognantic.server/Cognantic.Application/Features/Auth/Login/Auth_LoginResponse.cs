namespace Cognantic.Application.Features.Auth.Login;

public class Auth_LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty; // 🟢 Added
    public Guid? PatientId { get; set; }
    public Guid? ClinicianId { get; set; }
    public string? VettingStatus { get; set; } // Added to match handler
    public string? RejectionReason { get; set; } // Added to match handler
    public UserProfile User { get; set; } = null!; // 🟢 Added
}

// 🟢 Add this class inside the same file or namespace
public class UserProfile
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
}