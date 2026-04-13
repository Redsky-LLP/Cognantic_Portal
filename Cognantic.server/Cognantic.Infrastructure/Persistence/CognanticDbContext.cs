using Microsoft.EntityFrameworkCore;
using Cognantic.Domain.Entities;

namespace Cognantic.Infrastructure.Persistence;

public class CognanticDbContext : DbContext
{
    public CognanticDbContext(DbContextOptions<CognanticDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Patient> Patients { get; set; } = null!;
    public DbSet<Clinician> Clinicians { get; set; } = null!;
    public DbSet<Match> Matches { get; set; } = null!;
    public DbSet<Session> Sessions { get; set; } = null!;
    public DbSet<Wallet> Wallets { get; set; } = null!;
    public DbSet<WalletTransaction> WalletTransactions { get; set; } = null!;
    public DbSet<WithdrawalRequest> WithdrawalRequests { get; set; } = null!;
    public DbSet<SessionExtension> SessionExtensions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
            // ❌ REMOVED: entity.Property<uint>("xmin")...
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.ToTable("Patient");
            entity.HasKey(e => e.PatientId);
            entity.Property(e => e.PatientId).HasColumnName("UserId").ValueGeneratedNever();
            entity.HasOne(p => p.User).WithOne().HasForeignKey<Patient>(p => p.PatientId);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
            // ❌ REMOVED: entity.Property<uint>("xmin")...
        });

        modelBuilder.Entity<Clinician>(entity =>
        {
            entity.ToTable("Clinician");
            entity.HasKey(e => e.ClinicianId);
            entity.Property(e => e.ClinicianId).HasColumnName("ClinicianId").ValueGeneratedNever();
            entity.HasOne(c => c.User).WithOne().HasForeignKey<Clinician>(c => c.ClinicianId);
            entity.Property(e => e.HourlyRate).HasColumnType("numeric(18,2)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
            // ❌ REMOVED: entity.Property<uint>("xmin")...
        });

        modelBuilder.Entity<Match>(entity =>
        {
            entity.ToTable("Match");
            entity.HasKey(e => e.MatchId);
            entity.HasOne(m => m.Patient).WithMany(p => p.Matches).HasForeignKey(m => m.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(m => m.Clinician).WithMany(c => c.Matches).HasForeignKey(m => m.ClinicianId).OnDelete(DeleteBehavior.Restrict);
            entity.Property(e => e.MatchScore).HasColumnType("numeric(18,2)");
            // ❌ REMOVED: entity.Property<uint>("xmin")...
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("Session");
            entity.HasKey(e => e.SessionId);
            entity.Property(e => e.SessionId).HasColumnName("SessionId");
            entity.HasOne(s => s.Patient).WithMany().HasForeignKey(s => s.PatientId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(s => s.Clinician).WithMany().HasForeignKey(s => s.ClinicianId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Amount).HasColumnType("numeric(18,2)");
            entity.Property(e => e.MeetLink).HasMaxLength(500).IsRequired(false);
            entity.Property(e => e.ConfirmationCode).HasMaxLength(100).IsRequired(false);
            entity.Property(e => e.ActualStartTime).IsRequired(false);
            entity.Property(e => e.ActualEndTime).IsRequired(false);
            entity.Property(e => e.OvertimeMinutes).HasDefaultValue(0);
            entity.Property(e => e.OvertimeCharged).HasColumnType("numeric(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.LinkSentAt).IsRequired(false);
            entity.Property(e => e.ExtendedMinutes).HasDefaultValue(0);
            entity.Property(e => e.ScheduledEndTime).IsRequired();
            // ❌ REMOVED: entity.Property<uint>("xmin")...
        });

        modelBuilder.Entity<Wallet>(entity =>
        {
            entity.ToTable("Wallet");
            entity.HasKey(e => e.WalletId);
            entity.HasOne(w => w.User).WithOne(u => u.Wallet).HasForeignKey<Wallet>(w => w.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.Balance).HasColumnType("numeric(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.EscrowBalance).HasColumnType("numeric(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.OwnerType).HasMaxLength(20);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
            // ❌ REMOVED: entity.Property<uint>("xmin")...
        });

        modelBuilder.Entity<WalletTransaction>(entity =>
        {
            entity.ToTable("WalletTransaction");
            entity.HasKey(e => e.TransactionId);
            entity.HasOne(t => t.Wallet).WithMany(w => w.Transactions).HasForeignKey(t => t.WalletId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(t => t.Session).WithMany().HasForeignKey(t => t.SessionId).IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            entity.Property(e => e.Amount).HasColumnType("numeric(18,2)");
            entity.Property(e => e.BalanceAfter).HasColumnType("numeric(18,2)");
            entity.Property(e => e.TransactionType).HasMaxLength(50);
            entity.Property(e => e.Direction).HasMaxLength(10);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Completed");
            entity.Property(e => e.CreatedBy).HasMaxLength(100).HasDefaultValue("System");
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
            entity.HasIndex(e => e.WalletId);
            entity.HasIndex(e => e.SessionId);
            entity.HasIndex(e => e.CreatedTime);
        });

        modelBuilder.Entity<WithdrawalRequest>(entity =>
        {
            entity.ToTable("WithdrawalRequest");
            entity.HasKey(e => e.WithdrawalId);
            entity.HasOne(w => w.Clinician).WithMany().HasForeignKey(w => w.ClinicianId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.Amount).HasColumnType("numeric(18,2)");
            entity.Property(e => e.PayoutMethod).HasMaxLength(30).HasDefaultValue("UPI");
            entity.Property(e => e.PayoutDetails).HasMaxLength(200);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("Pending");
            entity.Property(e => e.AdminNotes).HasMaxLength(500);
            entity.Property(e => e.ProcessedBy).HasMaxLength(100);
            entity.Property(e => e.GatewayReference).HasMaxLength(200);
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
            entity.HasIndex(e => e.ClinicianId);
        });

        modelBuilder.Entity<SessionExtension>(entity =>
        {
            entity.ToTable("SessionExtension");
            entity.HasKey(e => e.ExtensionId);
            entity.HasOne(e => e.Session).WithMany(s => s.Extensions).HasForeignKey(e => e.SessionId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(e => e.AmountCharged).HasColumnType("numeric(18,2)");
            entity.Property(e => e.WalletContribution).HasColumnType("numeric(18,2)");
            entity.Property(e => e.UpiContribution).HasColumnType("numeric(18,2)");
            entity.Property(e => e.Status).HasMaxLength(30).HasDefaultValue("Requested");
            entity.Property(e => e.CreatedBy).HasMaxLength(100).HasDefaultValue("System");
            entity.Property(e => e.CreatedTime).HasDefaultValueSql("NOW()");
        });
    }
}