using Cognantic.Domain.Common;

namespace Cognantic.Domain.Entities
{
    public class Patient
    {
        // 🔑 Primary Key & Foreign Key to Users table
        public Guid PatientId { get; set; }

        // 🔗 1-to-1 Navigation Property to the Base User
        public virtual User User { get; set; } = null!;

        public string MRNo { get; set; } = string.Empty;
        public string? Narrative { get; set; }
        public int ResilienceScore { get; set; }

        // Navigation Property to matching clinician records
        public virtual ICollection<Match> Matches { get; set; } = new List<Match>();

        // 📊 Dhatri Project Audit Columns
        public bool IsActive { get; set; } = true;
        public DateTime CreatedTime { get; set; } = DateTime.UtcNow;
        public string CreatedBy { get; set; } = "System_Registration";
        
    }
}