using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace Cognantic.Application.Features.Auth;

public class ResetPasswordHandler : IRequestHandler<ResetPasswordRequest, Result<bool>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public ResetPasswordHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _ctxFactory = ctxFactory;
    }

    public async Task<Result<bool>> Handle(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.IsActive, cancellationToken);

        if (user == null)
        {
            return Result<bool>.Failure("User not found.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        await _context.SaveChangesAsync(CancellationToken.None);

        return Result<bool>.Success(true);
    }
}