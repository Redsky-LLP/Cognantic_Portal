using Microsoft.AspNetCore.Mvc;
using Cognantic.Application.Common;
using MediatR;
using Cognantic.Application.Features.Patients.Dashboard;
using Cognantic.Application.Features.Patients.Intake;
// Assuming this namespace exists for the profile request
using Cognantic.Application.Features.Patients.Profile;


namespace Cognantic.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class PatientsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PatientsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("intake")]
    public async Task<IActionResult> Intake([FromBody] Patient_IntakeRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    [HttpGet("dashboard/{patientId}")]
    public async Task<IActionResult> GetDashboard(Guid patientId)
    {
        var result = await _mediator.Send(new Patient_DashboardRequest { PatientId = patientId });
        return result.IsSuccess ? Ok(result) : NotFound(result);
    }

    // ── NEW: GET /api/v1/Patients/profile/{userId} ──────────────────
    // Checks if a patient profile exists for a specific User ID.
    [HttpGet("profile/{userId}")]
    public async Task<IActionResult> GetProfile(Guid userId)
    {
        // This should call a handler that queries the Patients table by UserId
        var result = await _mediator.Send(new Patient_GetProfileRequest { UserId = userId });
        return result.IsSuccess ? Ok(result) : NotFound(result);
    }
}