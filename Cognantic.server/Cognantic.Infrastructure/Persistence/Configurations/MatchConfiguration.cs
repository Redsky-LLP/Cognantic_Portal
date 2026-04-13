using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cognantic.Domain.Entities;

namespace Cognantic.Infrastructure.Persistence.Configurations;

public class MatchConfiguration : IEntityTypeConfiguration<Match>
{
    public void Configure(EntityTypeBuilder<Match> builder)
    {
        builder.ToTable("Match");

        builder.HasKey(x => x.MatchId);
        builder.Property(x => x.MatchId).HasColumnName("MatchId");

        builder.HasOne(x => x.Patient)
               .WithMany(p => p.Matches)
               .HasForeignKey(x => x.PatientId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Clinician)
               .WithMany(c => c.Matches)
               .HasForeignKey(x => x.ClinicianId)
               .OnDelete(DeleteBehavior.Restrict);

        
    }
}