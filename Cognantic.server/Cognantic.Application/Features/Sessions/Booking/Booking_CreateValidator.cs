using FluentValidation;

namespace Cognantic.Application.Features.Sessions.Booking;

public class Booking_CreateValidator : AbstractValidator<Booking_CreateRequest>
{
    public Booking_CreateValidator()
    {
        RuleFor(x => x.PatientId).NotEmpty();
        RuleFor(x => x.ClinicianId).NotEmpty();
        RuleFor(x => x.SessionDate).GreaterThan(DateTime.UtcNow)
            .WithMessage("Session date must be in the future.");
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(0);
    }
}