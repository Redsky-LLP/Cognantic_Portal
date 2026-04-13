using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Auth.Register;

public class Auth_RegisterRequest : IRequest<Result<Auth_RegisterResponse>>
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "patient"; // Default role

    /// <summary>
    /// The User ID provided by Supabase Auth from the frontend.
    /// This ensures the Backend database 'Id' matches the Auth 'Sub' claim.
    /// </summary>
    public Guid? ExternalId { get; set; }
}