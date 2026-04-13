using FluentValidation;

namespace Cognantic.Application.Features.Patients.Intake;

public class Patient_IntakeValidator : AbstractValidator<Patient_IntakeRequest>
{
    public Patient_IntakeValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("User ID is required.");

        // 📝 Validate Narrative instead of MRNo!
        RuleFor(x => x.Narrative)
            .NotEmpty().WithMessage("Please tell us what's on your mind.")
            .MaximumLength(1000).WithMessage("Narrative cannot exceed 1000 characters.");

        RuleFor(x => x.ResilienceScore)
            .InclusiveBetween(0, 100).WithMessage("Score must be between 0 and 100.");
    }
}