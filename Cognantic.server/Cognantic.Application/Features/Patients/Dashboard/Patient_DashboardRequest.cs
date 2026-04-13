using MediatR;
using Cognantic.Application.Common;

namespace Cognantic.Application.Features.Patients.Dashboard;

public class Patient_DashboardRequest : IRequest<Result<Patient_DashboardResponse>>
{
    public Guid PatientId { get; set; }
}