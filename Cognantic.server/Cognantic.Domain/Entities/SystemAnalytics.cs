using Cognantic.Domain.Common;

namespace Cognantic.Domain.Entities
{
    public class SystemAnalytics : BaseEntity
    {
        public int TotalPatients { get; set; }
        public int ActiveTherapists { get; set; }
        public decimal PlatformBalance { get; set; }
        public int PendingVettingCount { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}