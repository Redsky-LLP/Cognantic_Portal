using MediatR;
using Microsoft.EntityFrameworkCore;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;

namespace Cognantic.Application.Features.Admin.Vetting;

public class Admin_Vetting_ActionHandler
    : IRequestHandler<Admin_Vetting_ActionRequest, Result<Admin_Vetting_ActionResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public Admin_Vetting_ActionHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
        => _ctxFactory = ctxFactory;

    public async Task<Result<Admin_Vetting_ActionResponse>> Handle(
        Admin_Vetting_ActionRequest request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        var clinician = await _context.Clinicians
            .FirstOrDefaultAsync(c => c.ClinicianId == request.ClinicianId, cancellationToken);

        if (clinician == null)
            return Result<Admin_Vetting_ActionResponse>.Failure("Clinician not found.");

        string targetStatus = request.Action == "Approve" ? "Verified" : "Rejected";
        clinician.VettingStatus = targetStatus;

        if (request.Action == "Reject" && !string.IsNullOrEmpty(request.Reason))
        {
            clinician.RejectionReason = request.Reason;
        }
        else if (request.Action == "Approve")
        {
            clinician.RejectionReason = null;
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Result<Admin_Vetting_ActionResponse>.Success(new Admin_Vetting_ActionResponse
        {
            ClinicianId = clinician.ClinicianId,
            NewStatus = clinician.VettingStatus,
            ActionDate = DateTime.UtcNow,
            AdminNotes = clinician.RejectionReason,
        });
    }
}