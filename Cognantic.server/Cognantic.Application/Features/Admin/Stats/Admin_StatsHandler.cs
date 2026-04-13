using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Admin.Stats;

public class Admin_StatsHandler : IRequestHandler<Admin_StatsRequest, Result<Admin_StatsResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Admin_StatsHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _ctxFactory = ctxFactory;
    }

    public async Task<Result<Admin_StatsResponse>> Handle(Admin_StatsRequest request, CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        var stats = new Admin_StatsResponse
        {
            TotalPatients = await _context.Patients.CountAsync(p => p.IsActive, cancellationToken),
            TotalClinicians = await _context.Clinicians.CountAsync(c => c.IsActive, cancellationToken),
            ScheduledSessions = await _context.Sessions
                .CountAsync(s => s.Status == "Scheduled" && s.IsActive, cancellationToken),
            TotalRevenue = await _context.Sessions
                .Where(s => s.IsActive)
                .SumAsync(s => s.Amount, cancellationToken),
            AverageResilienceScore = await _context.Patients
                .Where(p => p.IsActive)
                .AverageAsync(p => (double?)p.ResilienceScore, cancellationToken) ?? 0,
            RecentActivities = await _context.Sessions
                .OrderByDescending(s => s.CreatedTime)
                .Take(5)
                .Select(s => new RecentActivityDto
                {
                    Description = $"New session booked for {s.SessionDate:g}",
                    Timestamp = s.CreatedTime,
                    Type = "Booking"
                })
                .ToListAsync(cancellationToken)
        };

        return Result<Admin_StatsResponse>.Success(stats);
    }
}