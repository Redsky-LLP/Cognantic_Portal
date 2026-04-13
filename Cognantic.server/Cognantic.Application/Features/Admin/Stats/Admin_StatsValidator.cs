using FluentValidation;

namespace Cognantic.Application.Features.Admin.Stats;

public class Admin_StatsValidator : AbstractValidator<Admin_StatsRequest>
{
    public Admin_StatsValidator()
    {
        // Validation logic for date ranges if applicable
        RuleFor(x => x.FromDate)
            .LessThanOrEqualTo(DateTime.UtcNow)
            .When(x => x.FromDate.HasValue);
    }
}