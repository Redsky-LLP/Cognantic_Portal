using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using BCrypt.Net;

namespace Cognantic.Application.Features.Auth.Login;

public class Auth_LoginHandler : IRequestHandler<Auth_LoginRequest, Result<Auth_LoginResponse>>
{
    private readonly IDbContextFactory<CognanticDbContext> _ctxFactory;
    private readonly IConfiguration _config;

    public Auth_LoginHandler(IDbContextFactory<CognanticDbContext> ctxFactory, IConfiguration config)
    {
        _ctxFactory = ctxFactory;
        _config = config;
    }

    public async Task<Result<Auth_LoginResponse>> Handle(
        Auth_LoginRequest request,
        CancellationToken cancellationToken)
    {
        await using var _context = await _ctxFactory.CreateDbContextAsync(cancellationToken);

        // 1. Fetch active user
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive, cancellationToken);

        if (user == null)
            return Result<Auth_LoginResponse>.Failure("Invalid credentials.");

        // 2. Verify password hash
        bool passwordValid;
        try
        {
            passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Manually onboarded user may have a plain-text or malformed hash
            // SECURITY: Allow plain-text match, then re-hash immediately so this path is not used again
            passwordValid = user.PasswordHash == request.Password;
            if (passwordValid)
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);
                await _context.SaveChangesAsync(CancellationToken.None);
            }
        }

        if (!passwordValid)
            return Result<Auth_LoginResponse>.Failure("Invalid credentials.");

        // 3. Profile Lookup - Restore IDs if they exist
        // ... after password verification ...

        Guid? patientId = null;
        Guid? clinicianId = null;
        string? vettingStatus = null;
        string? rejectionReason = null;

        if (user.Role == "Patient")
        {
            var patient = await _context.Patients
                .FirstOrDefaultAsync(p => p.PatientId == user.Id, cancellationToken);
            patientId = patient?.PatientId;
        }
        else if (user.Role == "Clinician" || user.Role == "Therapist")
        {
            var clinician = await _context.Clinicians
                .FirstOrDefaultAsync(c => c.ClinicianId == user.Id, cancellationToken);

            if (clinician != null)
            {
                clinicianId = clinician.ClinicianId;
                vettingStatus = clinician.VettingStatus;
                rejectionReason = clinician.RejectionReason;
            }
        }

        var token = GenerateJwtToken(user.Id, user.Email, user.Role);

        return Result<Auth_LoginResponse>.Success(new Auth_LoginResponse
        {
            Token = token,
            RefreshToken = Guid.NewGuid().ToString("N"), // Now matches DTO
            PatientId = patientId,
            ClinicianId = clinicianId,
            VettingStatus = vettingStatus,
            RejectionReason = rejectionReason,
            User = new UserProfile // Now matches DTO
            {
                Id = user.Id,
                Name = user.FullName,
                Email = user.Email,
                Role = user.Role.ToLower(),
                AvatarUrl = user.AvatarUrl
            }
        });
    }

    private string GenerateJwtToken(Guid userId, string email, string role)
    {
        var keyBytes = Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? "fallback_secret_key_for_dev_only_32chars!");
        var creds = new SigningCredentials(new SymmetricSecurityKey(keyBytes), SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
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