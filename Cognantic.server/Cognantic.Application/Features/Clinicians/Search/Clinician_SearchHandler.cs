using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Clinicians.Search
{
    public class Clinician_SearchHandler : IRequestHandler<Clinician_SearchRequest, Result<List<Clinician_SearchResponse>>>
    {
        private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

        public Clinician_SearchHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        {
            _ctxFactory = ctxFactory;
        }

        public async Task<Result<List<Clinician_SearchResponse>>> Handle(Clinician_SearchRequest request, CancellationToken cancellationToken)
        {
            await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

            if (_context.Clinicians == null)
                return Result<List<Clinician_SearchResponse>>.Failure("Database connection error.");

            var query = _context.Clinicians
                .AsNoTracking()
                .Where(c => c.IsActive && c.VettingStatus == "Verified");

            // Filter by Specialty
            if (!string.IsNullOrEmpty(request.Specialty))
            {
                query = query.Where(c => c.Specialty != null && c.Specialty.Contains(request.Specialty));
            }

            // Filter by Price
            if (request.MaxHourlyRate.HasValue)
            {
                query = query.Where(c => c.HourlyRate <= request.MaxHourlyRate.Value);
            }

            // Search in Name or Bio
            if (!string.IsNullOrEmpty(request.SearchTerm))
            {
                query = query.Where(c => (c.FullName != null && c.FullName.Contains(request.SearchTerm))
                                     || (c.Bio != null && c.Bio.Contains(request.SearchTerm)));
            }

            var results = await query
                .Select(c => new Clinician_SearchResponse
                {
                    ClinicianId = c.ClinicianId,
                    FullName = c.FullName ?? "Unknown",
                    Specialty = c.Specialty ?? "General",
                    Credential = c.Credential,
                    Bio = c.Bio,
                    HourlyRate = c.HourlyRate ?? 0,
                    Rating = 4.5
                })
                .ToListAsync(cancellationToken);

            return Result<List<Clinician_SearchResponse>>.Success(results);
        }
    }
}