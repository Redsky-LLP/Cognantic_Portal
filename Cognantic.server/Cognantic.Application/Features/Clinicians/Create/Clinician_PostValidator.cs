using FluentValidation;

namespace Cognantic.Application.Features.Clinicians.Create;

public class Clinician_PostValidator : AbstractValidator<Clinician_PostRequest>
{
    public Clinician_PostValidator()
    {
        // 🔑 Added: Ensure the base User ID is provided
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required.")
            .MaximumLength(100).WithMessage("Full name cannot exceed 100 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Please enter a valid email address structure.");

        RuleFor(x => x.Specialty)
            .NotEmpty().WithMessage("Specialty is required.");

        RuleFor(x => x.HourlyRate)
            .GreaterThan(0).WithMessage("Hourly rate must be a positive value.");
    }
}