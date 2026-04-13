using FluentValidation;

namespace Cognantic.Application.Features.Auth.Login;

public class Auth_LoginValidator : AbstractValidator<Auth_LoginRequest>
{
    public Auth_LoginValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.");
    }
}