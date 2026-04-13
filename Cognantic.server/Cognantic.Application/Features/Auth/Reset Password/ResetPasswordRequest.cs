using Cognantic.Application.Common;
using MediatR;

namespace Cognantic.Application.Features.Auth;

public class ResetPasswordRequest : IRequest<Result<bool>>
{
    public string Email { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}