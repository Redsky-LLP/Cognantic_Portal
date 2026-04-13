using FluentValidation;

namespace Cognantic.Application.Features.Patients.Dashboard;

public class Patient_DashboardValidator : AbstractValidator<Patient_DashboardRequest>
{
    public Patient_DashboardValidator()
    {
        RuleFor(x => x.PatientId)
            .NotEmpty().WithMessage("A valid PatientId is required to load the dashboard.");
    }
}