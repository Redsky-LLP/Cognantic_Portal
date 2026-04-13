using FluentValidation;

namespace Cognantic.Application.Features.Auth.Register;

public class Auth_RegisterValidator : AbstractValidator<Auth_RegisterRequest>
{
    public Auth_RegisterValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);
        RuleFor(x => x.Role).Must(x => new[] { "patient", "therapist" }.Contains(x.ToLower()))
            .WithMessage("Role must be either 'patient' or 'therapist'.");
    }
}