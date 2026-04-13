// PATH: Cognantic.Domain/Entities/Clinician.cs
//
// FIX (Bug 5): Added PhotoUrl property so the patient finder card
// can display the clinician's profile photo instead of initials only.

using System;
using System.Collections.Generic;

namespace Cognantic.Domain.Entities;

public class Clinician
{
    public Guid ClinicianId { get; set; }

    // 1-to-1 Navigation to Users table (shared PK)
    public virtual User User { get; set; } = null!;

    public string FullName { get; set; } = string.Empty;
    public string? Specialty { get; set; }
    public string? Languages { get; set; }
    public decimal? HourlyRate { get; set; }
    public string? VettingStatus { get; set; }   // "Pending" | "Verified" | "Rejected"
    public string? Credential { get; set; }
    public string? Bio { get; set; }
    public string? Email { get; set; }

    // ✅ FIX (Bug 5): Profile photo URL — stored in object storage (e.g. Supabase Storage).
    // Null means no photo uploaded; the frontend Avatar falls back to initials.
    public string? PhotoUrl { get; set; }

    // Populated by Admin_Vetting_ActionHandler when Action = "Reject".
    // Returned by Clinician_GetProfileHandler → stored in localStorage
    // → shown on TherapistPage as a red "rejected" banner.
    public string? RejectionReason { get; set; }

    // Audit Fields
    public bool IsActive { get; set; }
    public DateTime CreatedTime { get; set; }
    public string? CreatedBy { get; set; }

    // Relationships
    public virtual ICollection<Match> Matches { get; set; } = new List<Match>();
}