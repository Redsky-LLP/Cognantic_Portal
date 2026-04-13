using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.Application.Features.Auth;

// 1. The Query (The Request definition)
public class CheckUserExistsQuery : IRequest<bool>
{
    public string Email { get; set; } = string.Empty;
}

// 2. The Handler (The Database logic)
public class CheckUserExistsHandler : IRequestHandler<CheckUserExistsQuery, bool>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;

    public CheckUserExistsHandler(IDbContextFactory<CognanticDbContext> ctxFactory)
    {
        _ctxFactory = ctxFactory;
    }

    public async Task<bool> Handle(CheckUserExistsQuery request, CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        // Searches the Users table for a matching email (Safely lowercased)
        return await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.IsActive, cancellationToken);
    }
}