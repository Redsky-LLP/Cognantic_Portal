using MediatR;

namespace Cognantic.Application.Features.Auth.Recovery;

public class SendRecoveryEmailRequest : IRequest<bool>
{
    public string Email { get; set; } = string.Empty;
}