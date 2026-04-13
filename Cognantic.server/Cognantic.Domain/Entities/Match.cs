using System;

namespace Cognantic.Domain.Entities;

public class Match
{
    // If your DB has a specific MatchId, use this. 
    // If it uses a composite key (PatientId + ClinicianId), we map that in the DbContext.
    public Guid MatchId { get; set; }

    public Guid PatientId { get; set; }
    public virtual Patient Patient { get; set; } = null!;

    public Guid ClinicianId { get; set; }
    public virtual Clinician Clinician { get; set; } = null!;

    public decimal MatchScore { get; set; }
    public string? MatchReasons { get; set; }

    // Dhatri Audit Fields
    public bool IsActive { get; set; }
    public DateTime CreatedTime { get; set; }
    
}