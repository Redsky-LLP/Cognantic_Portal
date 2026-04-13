using Cognantic.API.Hubs;
using Cognantic.API.Services;
using Cognantic.Application.Common;
using Cognantic.Application.Features.Sessions.Booking;
using Cognantic.Application.Features.Sessions.End;
using Cognantic.Application.Features.Sessions.Extend;
using Cognantic.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class SessionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;
    private readonly ZoomService _zoom;
    private readonly IHubContext<SessionHub> _hub;

    public SessionsController(
        IMediator mediator,
        IDbContextFactory<CognanticDbContext> ctxFactory,
        ZoomService zoom,
        IHubContext<SessionHub> hub)
    {
        _mediator = mediator;
        _ctxFactory = ctxFactory;
        _zoom = zoom;
        _hub = hub;
    }

    // ── POST /api/v1/Sessions/book ────────────────────────────────
    [HttpPost("book")]
    public async Task<IActionResult> CreateBooking([FromBody] Booking_CreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MeetLink))
        {
            try
            {
                request.MeetLink = await _zoom.CreateMeetingAsync(
                    "Cognantic Session",
                    request.SessionDate);
            }
            catch
            {
                // Non-fatal — clinician can add the link manually later
            }
        }

        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Sessions/upcoming/{patientId} ─────────────────
    [HttpGet("upcoming/{patientId}")]
    public async Task<IActionResult> GetUpcoming(Guid patientId)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var sessions = await _context.Sessions
            .Include(s => s.Clinician)
                .ThenInclude(c => c.User)
            .Where(s => s.PatientId == patientId
                     && s.Status == "Scheduled"
                     && s.SessionDate >= DateTime.UtcNow
                     && s.IsActive)
            .OrderBy(s => s.SessionDate)
            .Select(s => new UpcomingSessionDto
            {
                SessionId = s.SessionId,
                SessionDate = s.SessionDate,
                SessionType = s.SessionType ?? "General Session",
                Status = s.Status,
                MeetLink = s.MeetLink,
                ConfirmationCode = s.ConfirmationCode,
                ClinicianName = s.Clinician.User.FullName,
                Amount = s.Amount,
            })
            .ToListAsync();

        return Ok(Result<List<UpcomingSessionDto>>.Success(sessions));
    }

    // ── PATCH /api/v1/Sessions/{sessionId}/meet-link ──────────────
    [HttpPatch("{sessionId}/meet-link")]
    public async Task<IActionResult> UpdateMeetLink(Guid sessionId, [FromBody] UpdateMeetLinkRequest body)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var session = await _context.Sessions.FindAsync(sessionId);
        if (session == null)
            return NotFound(Result<bool>.Failure("Session not found."));

        session.MeetLink = body.MeetLink;
        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(Result<bool>.Success(true, "Meet link updated."));
    }

    // ── POST /api/v1/Sessions/{id}/start ──────────────────────────
    [HttpPost("{sessionId}/start")]
    public async Task<IActionResult> StartSession(Guid sessionId, [FromBody] SessionStartRequest body)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var session = await _context.Sessions.FindAsync(sessionId);
        if (session == null)
            return NotFound(Result<bool>.Failure("Session not found."));

        if (session.ClinicianId != body.ClinicianId)
            return BadRequest(Result<bool>.Failure("Unauthorized: you are not the clinician for this session."));

        if (session.ActualStartTime.HasValue)
            return BadRequest(Result<bool>.Failure("Session already started."));

        session.ActualStartTime = DateTime.UtcNow;
        session.Status = "InProgress";

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(Result<bool>.Success(true, "Session started."));
    }

    // ── POST /api/v1/Sessions/{id}/end ────────────────────────────
    [HttpPost("{sessionId}/end")]
    public async Task<IActionResult> EndSession(Guid sessionId, [FromBody] SessionEndRequestBody body)
    {
        var result = await _mediator.Send(new Session_EndRequest
        {
            SessionId = sessionId,
            ClinicianId = body.ClinicianId,
        });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── POST /api/v1/Sessions/{sessionId}/extend ──────────────────
    [HttpPost("{sessionId}/extend")]
    public async Task<IActionResult> ExtendSession(Guid sessionId, [FromBody] ExtendSessionBody body)
    {
        var result = await _mediator.Send(new ExtendSessionCommand
        {
            SessionId = sessionId,
            PatientId = body.PatientId,
            ExtensionMinutes = body.ExtensionMinutes,
            UpiTopUpAmount = body.UpiTopUpAmount,
            UpiGatewayRef = body.UpiGatewayRef,
        });

        if (!result.IsSuccess) return BadRequest(result);

        if (result.Data?.Status == "Completed")
        {
            await _hub.Clients
                .Group(sessionId.ToString())
                .SendAsync("ExtensionConfirmed", new
                {
                    extensionMinutes = body.ExtensionMinutes,
                    newEndTime = result.Data.NewScheduledEndTime,
                    amountCharged = result.Data.AmountCharged,
                });
        }

        return Ok(result);
    }

    // ── GET /api/v1/Sessions/earnings/{clinicianId} ───────────────
    [HttpGet("earnings/{clinicianId}")]
    public async Task<IActionResult> GetEarnings(Guid clinicianId)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var wallet = await _context.Wallets
            .Include(w => w.Transactions.OrderByDescending(t => t.CreatedTime).Take(50))
            .FirstOrDefaultAsync(w => w.UserId == clinicianId);

        if (wallet == null)
            return Ok(Result<object>.Success(new { balance = 0m, transactions = Array.Empty<object>() }));

        var earnings = new
        {
            balance = wallet.Balance,
            escrowBalance = wallet.EscrowBalance,
            available = wallet.Balance - wallet.EscrowBalance,
            transactions = wallet.Transactions
                .Where(t => t.Direction == "Credit")
                .Select(t => new
                {
                    t.TransactionId,
                    t.TransactionType,
                    t.Amount,
                    t.Description,
                    t.CreatedTime,
                }),
        };

        return Ok(Result<object>.Success(earnings));
    }
}

public class UpcomingSessionDto
{
    public Guid SessionId { get; set; }
    public DateTime SessionDate { get; set; }
    public string SessionType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? MeetLink { get; set; }
    public string? ConfirmationCode { get; set; }
    public string ClinicianName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}

public class UpdateMeetLinkRequest
{
    public string? MeetLink { get; set; }
}

public class SessionStartRequest
{
    public Guid ClinicianId { get; set; }
}

public class SessionEndRequestBody
{
    public Guid ClinicianId { get; set; }
}

public class ExtendSessionBody
{
    public Guid PatientId { get; set; }
    public int ExtensionMinutes { get; set; }
    public decimal UpiTopUpAmount { get; set; } = 0m;
    public string? UpiGatewayRef { get; set; }
}