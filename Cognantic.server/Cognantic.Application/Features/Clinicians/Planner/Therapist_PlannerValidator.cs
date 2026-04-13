using FluentValidation;

namespace Cognantic.Application.Features.Clinicians.Planner;

public class Therapist_PlannerValidator : AbstractValidator<Therapist_PlannerRequest>
{
    public Therapist_PlannerValidator()
    {
        RuleFor(x => x.ClinicianId).NotEmpty().WithMessage("ClinicianId is required.");
        RuleFor(x => x.ViewDate).NotEmpty();
    }
}