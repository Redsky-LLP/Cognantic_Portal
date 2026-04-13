using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cognantic.Domain.Entities;

namespace Cognantic.Infrastructure.Persistence.Configurations;

public class SessionConfiguration : IEntityTypeConfiguration<Session>
{
    public void Configure(EntityTypeBuilder<Session> builder)
    {
        builder.ToTable("Session");

        builder.HasKey(x => x.SessionId);

        builder.Property(x => x.MeetLink).HasMaxLength(500).IsRequired(false);
        builder.Property(x => x.ConfirmationCode).HasMaxLength(100).IsRequired(false);
        builder.Property(x => x.Amount).HasColumnType("decimal(18,2)");

        // Added Relationship Configurations
        builder.HasOne(x => x.Patient)
               .WithMany()
               .HasForeignKey(x => x.PatientId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Clinician)
               .WithMany()
               .HasForeignKey(x => x.ClinicianId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}