using FluentValidation;

namespace Cognantic.Application.Features.Auth.Recovery;

public class SendRecoveryEmailValidator : AbstractValidator<SendRecoveryEmailRequest>
{
    public SendRecoveryEmailValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email address is required.")
            .EmailAddress().WithMessage("Please enter a valid email address structure.");
    }
}