using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Auth.Login;

public class Auth_LoginRequest : IRequest<Result<Auth_LoginResponse>>
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}