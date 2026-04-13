using FluentValidation;

namespace Cognantic.Application.Features.Clinicians.Search;

public class Clinician_SearchValidator : AbstractValidator<Clinician_SearchRequest>
{
    public Clinician_SearchValidator()
    {
        RuleFor(x => x.MaxHourlyRate)
            .GreaterThan(0)
            .When(x => x.MaxHourlyRate.HasValue);

        RuleFor(x => x.SearchTerm)
            .MinimumLength(2)
            .When(x => !string.IsNullOrEmpty(x.SearchTerm));
    }
}