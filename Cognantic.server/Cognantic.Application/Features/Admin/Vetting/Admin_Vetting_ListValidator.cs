using FluentValidation;

namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ListValidator : AbstractValidator<Admin_Vetting_ListRequest>
{
    public Admin_Vetting_ListValidator()
    {
        // Optional: Ensure StatusFilter matches known DB values if provided
        RuleFor(x => x.StatusFilter)
            .MaximumLength(20)
            .When(x => !string.IsNullOrEmpty(x.StatusFilter));
    }
}