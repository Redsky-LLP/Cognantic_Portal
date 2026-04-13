using FluentValidation;

namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ActionValidator : AbstractValidator<Admin_Vetting_ActionRequest>
{
    public Admin_Vetting_ActionValidator()
    {
        RuleFor(x => x.ClinicianId).NotEmpty();
        RuleFor(x => x.Action).NotEmpty()
            .Must(x => x == "Approve" || x == "Reject")
            .WithMessage("Action must be either 'Approve' or 'Reject'.");

        RuleFor(x => x.Reason)
            .NotEmpty().When(x => x.Action == "Reject")
            .WithMessage("A reason is required when rejecting a clinician.");
    }
}