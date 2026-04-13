using MediatR;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Mail;

namespace Cognantic.Application.Features.Auth.Recovery;

public class SendRecoveryEmailCommand : IRequest<bool>
{
    public string Email { get; set; } = string.Empty;
}

public class SendRecoveryEmailHandler : IRequestHandler<SendRecoveryEmailCommand, bool>
{
    private readonly IConfiguration _configuration;

    public SendRecoveryEmailHandler(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<bool> Handle(SendRecoveryEmailCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp.gmail.com";
            var port = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
            var senderEmail = _configuration["Email:Username"] ?? throw new InvalidOperationException("Email:Username not configured");
            var senderPassword = _configuration["Email:Password"] ?? throw new InvalidOperationException("Email:Password not configured");
            var fromAddr = _configuration["Email:FromAddress"] ?? senderEmail;
            var frontendUrl = _configuration["Email:FrontendUrl"] ?? "http://localhost:5173";

            using var client = new SmtpClient(smtpHost, port)
            {
                Credentials = new NetworkCredential(senderEmail, senderPassword),
                EnableSsl = true
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromAddr),
                Subject = "Cognantic - Reset Your Password",
                Body = $"<h3>Hello!</h3><p>Click the link below to reset your password:</p><a href='{frontendUrl}/reset-password?email={request.Email}'>Reset Password</a>",
                IsBodyHtml = true
            };

            mailMessage.To.Add(request.Email);

            await client.SendMailAsync(mailMessage, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"SMTP Error: {ex.Message}");
            return false;
        }
    }
}