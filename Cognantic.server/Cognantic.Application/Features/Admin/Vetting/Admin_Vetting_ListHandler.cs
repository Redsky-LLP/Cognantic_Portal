using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Admin.Vetting
{
    public class Admin_Vetting_ListHandler : IRequestHandler<Admin_Vetting_ListRequest, Result<List<Admin_Vetting_ListResponse>>>
    {
        private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

        public Admin_Vetting_ListHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        {
            _ctxFactory = ctxFactory;
        }

        public async Task<Result<List<Admin_Vetting_ListResponse>>> Handle(Admin_Vetting_ListRequest request, CancellationToken cancellationToken)
        {
            await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

            var query = _context.Clinicians.AsNoTracking();

            if (!string.IsNullOrEmpty(request.StatusFilter))
            {
                query = query.Where(c => c.VettingStatus == request.StatusFilter);
            }
            else
            {
                query = query.Where(c => c.VettingStatus != "Verified");
            }

            var list = await query
                .OrderByDescending(c => c.CreatedTime)
                .Select(c => new Admin_Vetting_ListResponse
                {
                    ClinicianId = c.ClinicianId,
                    FullName = c.FullName ?? "Unknown",
                    Specialty = c.Specialty ?? "N/A",
                    VettingStatus = c.VettingStatus ?? "Pending",
                    Credential = c.Credential ?? "N/A",
                    CreatedTime = c.CreatedTime,
                    IsActive = c.IsActive
                })
                .ToListAsync(cancellationToken);

            return Result<List<Admin_Vetting_ListResponse>>.Success(list);
        }
    }
}