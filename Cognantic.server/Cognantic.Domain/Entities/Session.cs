namespace Cognantic.Domain.Entities;

public class Session
{
    public Guid SessionId { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid ClinicianId { get; set; }
    public virtual Clinician Clinician { get; set; } = null!;

    public DateTime SessionDate { get; set; }
    public int ModuleStep { get; set; }
    public string? SessionType { get; set; }
    public string Status { get; set; } = "Scheduled";
    public decimal Amount { get; set; }
    public string? Notes { get; set; }

    // ── Existing meeting fields ───────────────────────────────────
    public string? MeetLink { get; set; }
    public string? ConfirmationCode { get; set; }

    // ── NEW: Session timing ───────────────────────────────────────
    /// <summary>Set by POST /Sessions/{id}/start</summary>
    public DateTime? ActualStartTime { get; set; }

    /// <summary>Set by POST /Sessions/{id}/end — triggers overtime calc</summary>
    public DateTime? ActualEndTime { get; set; }

    /// <summary>Total minutes beyond the booked 60-min slot (0 if on time)</summary>
    public int OvertimeMinutes { get; set; } = 0;

    /// <summary>Total extra amount debited for overtime (₹)</summary>
    public decimal OvertimeCharged { get; set; } = 0m;

    // ── NEW: Meet-link notification sentinel ──────────────────────
    /// <summary>
    /// Set to UtcNow by MeetLinkDispatcher once the 15-min reminder
    /// email has been sent. NULL = not sent yet.
    /// </summary>
    public DateTime? LinkSentAt { get; set; }

    // ── NEW: Extension Tracking ───────────────────────────────────
    /// <summary>Cumulative minutes added via patient-initiated extensions</summary>
    public int ExtendedMinutes { get; set; } = 0;

    /// <summary>Computed scheduled end: SessionDate + 60min + ExtendedMinutes</summary>
    public DateTime ScheduledEndTime { get; set; }

    /// <summary>Navigation property for individual extension records</summary>
    public virtual ICollection<SessionExtension> Extensions { get; set; } = new List<SessionExtension>();

    // ── Audit ─────────────────────────────────────────────────────
    public bool IsActive { get; set; }
    public DateTime CreatedTime { get; set; }
    public string? CreatedBy { get; set; }
    
}