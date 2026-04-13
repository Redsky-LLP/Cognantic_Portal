using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cognantic.Domain.Entities;

namespace Cognantic.Infrastructure.Persistence.Configurations;

public class ClinicianConfiguration : IEntityTypeConfiguration<Clinician>
{
    public void Configure(EntityTypeBuilder<Clinician> builder)
    {
        builder.ToTable("Clinician");

        // 1. Set the Primary Key
        builder.HasKey(x => x.ClinicianId);

        // 2. Map ClinicianId to "UserId" column to match PatientConfiguration
        builder.Property(x => x.ClinicianId)
               .HasColumnName("UserId")
               .ValueGeneratedNever();

        // 3. Configure the 1:1 relationship with the User table
        // This ensures that Clinician.ClinicianId points to User.Id
        builder.HasOne(x => x.User)
               .WithOne()
               .HasForeignKey<Clinician>(x => x.ClinicianId)
               .OnDelete(DeleteBehavior.Cascade);

        // 4. Property Configurations
        builder.Property(x => x.HourlyRate).HasColumnType("decimal(18,2)");
        builder.Property(x => x.Specialty).HasMaxLength(200).IsRequired(false);
        builder.Property(x => x.Bio).HasMaxLength(2000).IsRequired(false);
    }
}