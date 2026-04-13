using FluentValidation;

namespace Cognantic.Application.Features.Clinicians.AvailableSlots.Get;

public class Available_SlotsValidator : AbstractValidator<Available_SlotsRequest>
{
    public Available_SlotsValidator()
    {
        RuleFor(x => x.ClinicianId).NotEmpty();
        RuleFor(x => x.StartDate).NotEmpty().GreaterThanOrEqualTo(DateTime.Today);
        RuleFor(x => x.EndDate).GreaterThan(x => x.StartDate);
    }
}