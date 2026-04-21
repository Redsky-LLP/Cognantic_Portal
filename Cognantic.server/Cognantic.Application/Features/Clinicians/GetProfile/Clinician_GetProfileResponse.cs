using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Clinicians.GetProfile;

public class Clinician_GetProfileResponse
{
    public Guid ClinicianId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public string? Languages { get; set; }
    public string? Credential { get; set; }
    public string? Bio { get; set; }
    public decimal? HourlyRate { get; set; }

    /// <summary>
    /// "Pending" | "Verified" | "Rejected"
    /// Stored in localStorage as 'clinicianVettingStatus'.
    /// </summary>
    public string VettingStatus { get; set; } = string.Empty;

    /// <summary>
    /// Populated only when VettingStatus = "Rejected".
    /// Contains the admin's reason text entered during vetting action.
    /// Stored in localStorage as 'clinicianRejectionReason'.
    /// </summary>
    public string? RejectionReason { get; set; }

    public bool IsActive { get; set; }
    public DateTime CreatedTime { get; set; }

    /// <summary>
    /// Profile photo URL - stored in object storage (Azure Blob / local)
    /// </summary>
    public string? PhotoUrl { get; set; }
}