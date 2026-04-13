using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Cognantic.Domain.Entities;

namespace Cognantic.Infrastructure.Persistence.Configurations;

public class PatientConfiguration : IEntityTypeConfiguration<Patient>
{
    public void Configure(EntityTypeBuilder<Patient> builder)
    {
        builder.ToTable("Patient");

        builder.HasKey(x => x.PatientId);

        builder.Property(x => x.PatientId)
               .HasColumnName("UserId")
               .ValueGeneratedNever();

        builder.HasOne(x => x.User)
               .WithOne()
               .HasForeignKey<Patient>(x => x.PatientId)
               .OnDelete(DeleteBehavior.Cascade);

        builder.Property(x => x.MRNo).IsRequired().HasMaxLength(50);
        builder.HasIndex(x => x.MRNo).IsUnique();

        
    }
}