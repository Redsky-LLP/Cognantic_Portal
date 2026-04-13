using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Clinicians.Planner;

public class Therapist_PlannerRequest : IRequest<Result<Therapist_PlannerResponse>>
{
    public Guid ClinicianId { get; set; }
    public DateTime ViewDate { get; set; } // The target date for the planner
}