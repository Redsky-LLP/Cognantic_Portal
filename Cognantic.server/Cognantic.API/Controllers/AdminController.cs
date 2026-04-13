// ─────────────────────────────────────────────────────────────────
// PATH: Cognantic.API/Controllers/AdminController.cs
//
// FIX (Bug 1 + Bug 2): Replaced [Authorize(Roles = "admin")] with
// plain [Authorize] on the entire controller.
// FIX 2: Replaced direct DbContext with IDbContextFactory
// ─────────────────────────────────────────────────────────────────

using Cognantic.Application.Common;
using Cognantic.Application.Features.Admin.ManualOnboard;
using Cognantic.Application.Features.Admin.Stats;
using Cognantic.Application.Features.Admin.Vetting;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]   // ← valid JWT required; role guard is handled in React routing
public class AdminController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public AdminController(IMediator mediator, IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _mediator = mediator;
        _ctxFactory = ctxFactory;
    }

    // ── GET /api/v1/Admin/stats ────────────────────────────────────
    [HttpGet("stats")]
    public async Task<IActionResult> GetGlobalStats([FromQuery] DateTime? fromDate)
    {
        var result = await _mediator.Send(new Admin_StatsRequest { FromDate = fromDate });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Admin/vetting-list ────────────────────────────
    [HttpGet("vetting-list")]
    public async Task<IActionResult> GetVettingList([FromQuery] string? status)
    {
        var result = await _mediator.Send(
            new Admin_Vetting_ListRequest { StatusFilter = status });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── POST /api/v1/Admin/vetting-action ─────────────────────────
    [HttpPost("vetting-action")]
    public async Task<IActionResult> ProcessVettingAction(
        [FromBody] Admin_Vetting_ActionRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── POST /api/v1/Admin/manual-onboard ─────────────────────────
    [HttpPost("manual-onboard")]
    public async Task<IActionResult> ManualOnboard(
        [FromBody] Admin_ManualOnboard_Request request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Admin/withdrawal-requests ─────────────────────
    [HttpGet("withdrawal-requests")]
    public async Task<IActionResult> GetAllWithdrawalRequests([FromQuery] string? status)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var query = _context.WithdrawalRequests
            .Include(w => w.Clinician)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
            query = query.Where(w => w.Status == status);
        else
            query = query.Where(w => w.Status == "Pending");

        var result = await query
            .OrderByDescending(w => w.CreatedTime)
            .Select(w => new
            {
                w.WithdrawalId,
                w.Amount,
                w.PayoutMethod,
                w.PayoutDetails,
                w.Status,
                w.AdminNotes,
                w.ProcessedAt,
                w.CreatedTime,
                ClinicianName = w.Clinician.FullName,
            }).ToListAsync();

        return Ok(Result<object>.Success(result));
    }
}