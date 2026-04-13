using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cognantic.Application.Common;
using Cognantic.Application.Features.Auth.Login;
using Cognantic.Domain.Entities;
using Cognantic.Infrastructure.Persistence;
using BCrypt.Net;

namespace Cognantic.Application.Features.Auth.Register;

public class Auth_RegisterHandler : IRequestHandler<Auth_RegisterRequest, Result<Auth_RegisterResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;
    private readonly IConfiguration _config;

    public Auth_RegisterHandler(IDbContextFactory<CognanticDbContext> ctxFactory, IConfiguration config)
    {
        _ctxFactory = ctxFactory;
        _config = config;
    }

    public async Task<Result<Auth_RegisterResponse>> Handle(
     Auth_RegisterRequest request,
     CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        // 1. Duplicate email check
        bool exists = await _context.Users
            .AnyAsync(u => u.Email == request.Email, cancellationToken);

        if (exists)
            return Result<Auth_RegisterResponse>.Failure("Email is already registered.");

        // 2. Hash password
        string saltedHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // 3. Create User entity only
        var user = new User
        {
            // Use the ID from Supabase if provided, otherwise generate a new one
            Id = request.ExternalId ?? Guid.NewGuid(),
            FullName = request.FullName,
            Email = request.Email,
            PasswordHash = saltedHash,
            Role = request.Role.ToLower(),
            IsActive = true,
            CreatedTime = DateTime.UtcNow,
            CreatedBy = "System_Register"
        };

        _context.Users.Add(user);

        // ✅ REMOVED: Do NOT pre-create a Clinician or Patient row here.
        // Clinician row is created by ClinicianOnboardingForm → POST /api/v1/Clinicians
        // Patient row is created by PatientIntakeForm    → POST /api/v1/Patients/intake
        // Pre-creating them here bypasses onboarding entirely.

        await _context.SaveChangesAsync(CancellationToken.None);

        // 4. Generate real JWT — same logic as Auth_LoginHandler
        var token = GenerateJwtToken(user.Id, user.Email, user.Role);

        return Result<Auth_RegisterResponse>.Success(new Auth_RegisterResponse
        {
            Token = token,
            RefreshToken = Guid.NewGuid().ToString("N"),
            User = new UserProfile
            {
                Id = user.Id,
                Name = user.FullName,
                Email = user.Email,
                Role = user.Role,
                AvatarUrl = null
            }
        });
    }

    private string GenerateJwtToken(Guid userId, string email, string role)
    {
        var keyBytes = Encoding.UTF8.GetBytes(
            _config["Jwt:Key"] ?? "fallback_secret_key_for_dev_only_32chars!");

        var creds = new SigningCredentials(
            new SymmetricSecurityKey(keyBytes),
            SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti,   Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, role.ToLower()),
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}