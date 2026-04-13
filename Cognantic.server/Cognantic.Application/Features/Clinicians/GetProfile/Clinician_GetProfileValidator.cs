using FluentValidation;

namespace Cognantic.Application.Features.Clinicians.GetProfile;

public class Clinician_GetProfileValidator : AbstractValidator<Clinician_GetProfileRequest>
{
    public Clinician_GetProfileValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty().WithMessage("UserId is required.");
    }
}