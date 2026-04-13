using FluentValidation;

namespace Cognantic.Application.Features.Clinicians.Match;

public class Clinician_MatchesValidator : AbstractValidator<Clinician_MatchesRequest>
{
    public Clinician_MatchesValidator()
    {
        RuleFor(x => x.PatientId)
            .NotEmpty().WithMessage("PatientId is required to find matches.");
    }
}