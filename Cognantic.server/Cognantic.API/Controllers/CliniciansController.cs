// ─────────────────────────────────────────────────────────────────
// PATH: Cognantic.API/Controllers/CliniciansController.cs  ── UPDATED
//
// Change: Added GET /api/v1/Clinicians/profile/{userId} endpoint.
// Change: Added POST /api/v1/Clinicians/{clinicianId}/photo endpoint.
//
// This endpoint is called by the frontend on every therapist login
// when 'clinicianId' is missing from localStorage. It returns the
// clinician's profile including VettingStatus so the frontend can:
//   a) Store clinicianId in localStorage (skips onboarding on re-login)
//   b) Show a "Pending" banner on the therapist dashboard
//   c) Route correctly: if no profile → clinician-onboarding view
// ─────────────────────────────────────────────────────────────────

using Cognantic.Application.Common;
using Cognantic.Application.Features.Clinicians.AvailableSlots.Get;
using Cognantic.Application.Features.Clinicians.Create;
using Cognantic.Application.Features.Clinicians.GetProfile;        // ← NEW
using Cognantic.Application.Features.Clinicians.Match;
using Cognantic.Application.Features.Clinicians.Planner;
using Cognantic.Application.Features.Clinicians.Search;
using Cognantic.Infrastructure.Persistence;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.API.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class CliniciansController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public CliniciansController(IMediator mediator, IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _mediator = mediator;
        _ctxFactory = ctxFactory;
    }

    // ── GET /api/v1/Clinicians/matches/{patientId} ─────────────────
    [HttpGet("matches/{patientId}")]
    public async Task<IActionResult> GetMatches(Guid patientId, [FromQuery] string? specialty)
    {
        var result = await _mediator.Send(new Clinician_MatchesRequest
        {
            PatientId = patientId,
            SpecialtyPreference = specialty
        });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Clinicians/{clinicianId}/available-slots ───────
    [HttpGet("{clinicianId}/available-slots")]
    public async Task<IActionResult> GetAvailableSlots(
        Guid clinicianId,
        [FromQuery] DateTime start,
        [FromQuery] DateTime end)
    {
        var result = await _mediator.Send(new Available_SlotsRequest
        {
            ClinicianId = clinicianId,
            StartDate = start,
            EndDate = end
        });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Clinicians/{clinicianId}/planner ───────────────
    [HttpGet("{clinicianId}/planner")]
    public async Task<IActionResult> GetPlanner(Guid clinicianId, [FromQuery] DateTime? date)
    {
        var targetDate = date ?? DateTime.UtcNow;
        var result = await _mediator.Send(new Therapist_PlannerRequest
        {
            ClinicianId = clinicianId,
            ViewDate = targetDate
        });
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── POST /api/v1/Clinicians ────────────────────────────────────
    // [Authorize] intentionally removed — handler validates identity
    // via email→User lookup. Safe: duplicate-profile guard is internal.
    [HttpPost]
    public async Task<IActionResult> CreateClinician([FromBody] Clinician_PostRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ── GET /api/v1/Clinicians/search ─────────────────────────────
    [HttpGet("search")]
    public async Task<IActionResult> SearchClinicians([FromQuery] Clinician_SearchRequest request)
    {
        var result = await _mediator.Send(request);
        return result.IsSuccess ? Ok(result) : BadRequest(result);
    }

    // ══════════════════════════════════════════════════════════════
    // NEW ENDPOINT
    // ── GET /api/v1/Clinicians/profile/{userId} ───────────────────
    //
    // Called by the frontend on therapist login when clinicianId is
    // absent from localStorage. Returns the clinician profile (or a
    // 404-style failure if the user hasn't submitted onboarding yet).
    //
    // The frontend flow:
    //   1. Therapist logs in → handleAuthSuccess() checks localStorage('clinicianId')
    //   2. If missing → calls this endpoint with their userId
    //   3a. 200 success → store clinicianId, show dashboard (with Pending banner if needed)
    //   3b. Failure     → route to clinician-onboarding view
    // ══════════════════════════════════════════════════════════════
    [HttpGet("profile/{userId}")]
    [Authorize]
    public async Task<IActionResult> GetProfile(Guid userId)
    {
        var result = await _mediator.Send(new Clinician_GetProfileRequest { UserId = userId });

        if (!result.IsSuccess)
        {
            // 404 so the frontend knows "no profile" vs "server error"
            return NotFound(result);
        }

        return Ok(result);
    }

    // ══════════════════════════════════════════════════════════════
    // NEW ENDPOINT - Photo Upload
    // ── POST /api/v1/Clinicians/{clinicianId}/photo ───────────────
    [HttpPost("{clinicianId}/photo")]
    [Authorize]
    public async Task<IActionResult> UploadPhoto(Guid clinicianId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(Result<bool>.Failure("No file uploaded."));

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/jpg", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(Result<bool>.Failure("Only JPEG, PNG, and WEBP images are allowed."));

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(Result<bool>.Failure("File size must be less than 5MB."));

        await using var _context = await _ctxFactory.CreateDbContextAsync();

        var clinician = await _context.Clinicians
            .FirstOrDefaultAsync(c => c.ClinicianId == clinicianId);

        if (clinician == null)
            return NotFound(Result<bool>.Failure("Clinician not found."));

        var extension = Path.GetExtension(file.FileName);
        var fileName = $"{clinicianId}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "clinicians");
        if (!Directory.Exists(uploadsDir))
            Directory.CreateDirectory(uploadsDir);

        var filePath = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var photoUrl = $"{baseUrl}/uploads/clinicians/{fileName}";

        clinician.PhotoUrl = photoUrl;
        await _context.SaveChangesAsync();

        return Ok(Result<object>.Success(new { photoUrl }));
    }
}