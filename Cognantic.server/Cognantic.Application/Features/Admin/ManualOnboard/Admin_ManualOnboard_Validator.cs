using FluentValidation;

namespace Cognantic.Application.Features.Admin.ManualOnboard;

public class Admin_ManualOnboard_Validator : AbstractValidator<Admin_ManualOnboard_Request>
{
    public Admin_ManualOnboard_Validator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(100).WithMessage("Full name cannot exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.Specialty)
            .NotEmpty().WithMessage("Specialty is required.");

        RuleFor(x => x.HourlyRate)
            .GreaterThan(0).WithMessage("Hourly rate must be a positive value.");

        RuleFor(x => x.Credential)
            .NotEmpty().WithMessage("At least one credential/degree is required.");
    }
}