using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Patients.Intake
{
    public class Patient_IntakeHandler : IRequestHandler<Patient_IntakeRequest, Result<Patient_IntakeResponse>>
    {
        private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

        public Patient_IntakeHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        {
            _ctxFactory = ctxFactory;
        }

        public async Task<Result<Patient_IntakeResponse>> Handle(Patient_IntakeRequest request, CancellationToken cancellationToken)
        {
            await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

            // 1. Verify standard User identity first
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            if (user == null)
            {
                return Result<Patient_IntakeResponse>.Failure($"User with ID {request.UserId} does not exist. Please register the user first.");
            }

            // Safety Check: Prevent duplicate profiles
            bool patientExists = await _context.Patients
                .AnyAsync(p => p.PatientId == request.UserId, cancellationToken);

            if (patientExists)
            {
                return Result<Patient_IntakeResponse>.Failure("A patient profile already exists for this user.");
            }

            // Auto-generate unique MRNo
            string generatedMRNo = await GenerateUniqueMRNAsync(_context, cancellationToken);

            // 2. Create the Clinical Patient Profile
            var patient = new Patient
            {
                PatientId = request.UserId,
                MRNo = generatedMRNo,
                Narrative = request.Narrative,
                ResilienceScore = request.ResilienceScore,
                IsActive = true,
                CreatedTime = DateTime.UtcNow,
                CreatedBy = "System_Intake"
            };

            _context.Patients.Add(patient);
            await _context.SaveChangesAsync(CancellationToken.None);

            var response = new Patient_IntakeResponse
            {
                Id = patient.PatientId,
                MRNo = patient.MRNo,
                FullName = user.FullName,
                CreatedAt = patient.CreatedTime
            };

            return Result<Patient_IntakeResponse>.Success(response, "Patient profile created successfully!");
        }

        private async Task<string> GenerateUniqueMRNAsync(CognanticDbContext _context, CancellationToken cancellationToken)
        {
            var random = new Random();
            string mrn;
            bool exists;

            do
            {
                int numericPart = random.Next(100000, 999999);
                mrn = $"MRN-{numericPart}";

                exists = await _context.Patients.AnyAsync(p => p.MRNo == mrn, cancellationToken);

            } while (exists);

            return mrn;
        }
    }
}