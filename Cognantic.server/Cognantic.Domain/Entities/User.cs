using System.ComponentModel.DataAnnotations;

namespace Cognantic.Domain.Entities;

public class User
{
    [Key]
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "patient"; // patient, therapist, admin
    public string? AvatarUrl { get; set; }

    // Navigation: Wallet (one-to-one)
    public virtual Wallet? Wallet { get; set; }

    // Audit Fields (Required by your Tech Spec)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = "System";
    
}