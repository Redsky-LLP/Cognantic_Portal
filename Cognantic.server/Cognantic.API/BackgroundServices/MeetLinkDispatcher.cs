using Cognantic.Infrastructure.Persistence;
using MailKit.Net.Smtp;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using System.Net.Mail;

namespace Cognantic.API.BackgroundServices;

public class MeetLinkDispatcher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MeetLinkDispatcher> _logger;
    private readonly IConfiguration _config;

    // How far before the session to send the link (minutes)
    private const int NotifyWindowMin = 13;
    private const int NotifyWindowMax = 17;

    public MeetLinkDispatcher(
        IServiceScopeFactory scopeFactory,
        ILogger<MeetLinkDispatcher> logger,
        IConfiguration config)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _config = config;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("MeetLinkDispatcher started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DispatchPendingLinksAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MeetLinkDispatcher error during dispatch cycle.");
            }

            // Run every 60 seconds
            await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);
        }
    }

    private async Task DispatchPendingLinksAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CognanticDbContext>();

        var now = DateTime.UtcNow;
        var minTime = now.AddMinutes(NotifyWindowMin);
        var maxTime = now.AddMinutes(NotifyWindowMax);

        // Find sessions in the 13–17 min window with a link not yet sent
        var sessions = await db.Sessions
            .Include(s => s.Clinician)
            .Include(s => s.Patient)
                .ThenInclude(p => p.User)
            .Where(s =>
                s.Status == "Scheduled" &&
                s.IsActive &&
                s.MeetLink != null &&
                s.LinkSentAt == null &&
                s.SessionDate >= minTime &&
                s.SessionDate <= maxTime)
            .ToListAsync(ct);

        if (sessions.Count == 0) return;

        _logger.LogInformation("MeetLinkDispatcher: sending links for {Count} sessions.", sessions.Count);

        foreach (var session in sessions)
        {
            try
            {
                var patientEmail = session.Patient.User.Email;
                var patientName = session.Patient.User.FullName;
                var clinicianEmail = session.Clinician.Email ?? string.Empty;
                var clinicianName = session.Clinician.FullName;
                var sessionTime = session.SessionDate.ToString("f");
                var meetLink = session.MeetLink!;

                // Send to patient
                if (!string.IsNullOrWhiteSpace(patientEmail))
                    await SendEmailAsync(
                        to: patientEmail,
                        name: patientName,
                        subject: "Your session starts in 15 minutes — join link inside",
                        body: BuildEmailBody(patientName, clinicianName, sessionTime, meetLink, isPatient: true));

                // Send to clinician
                if (!string.IsNullOrWhiteSpace(clinicianEmail))
                    await SendEmailAsync(
                        to: clinicianEmail,
                        name: clinicianName,
                        subject: $"Session with {patientName} starts in 15 minutes",
                        body: BuildEmailBody(clinicianName, patientName, sessionTime, meetLink, isPatient: false));

                // Stamp to prevent re-sending
                session.LinkSentAt = now;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send meet link for session {SessionId}.", session.SessionId);
            }
        }

        await db.SaveChangesAsync(CancellationToken.None);
    }

    private static string BuildEmailBody(
        string recipientName,
        string otherPartyName,
        string sessionTime,
        string meetLink,
        bool isPatient)
    {
        var roleLabel = isPatient ? "clinician" : "patient";

        return $"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="background:#39786A; padding:24px; border-radius:12px 12px 0 0;">
                <h2 style="color:white; margin:0;">Cognantic — Session Reminder</h2>
              </div>
              <div style="background:#f9f9f9; padding:24px; border-radius:0 0 12px 12px; border:1px solid #e0e0e0;">
                <p>Hi <strong>{recipientName}</strong>,</p>
                <p>Your session with your <strong>{roleLabel} {otherPartyName}</strong> starts in <strong>15 minutes</strong>.</p>
                <table style="width:100%; border-collapse:collapse; margin:16px 0;">
                  <tr><td style="padding:8px; color:#666;">Session time</td><td style="padding:8px; font-weight:bold;">{sessionTime} (UTC)</td></tr>
                </table>
                <div style="text-align:center; margin:24px 0;">
                  <a href="{meetLink}"
                     style="background:#39786A; color:white; padding:14px 32px; border-radius:8px;
                            text-decoration:none; font-size:16px; font-weight:bold; display:inline-block;">
                    📹 Join Session
                  </a>
                </div>
                <p style="color:#888; font-size:13px;">
                  Or copy this link into your browser:<br/>
                  <a href="{meetLink}" style="color:#39786A;">{meetLink}</a>
                </p>
                <hr style="border:none; border-top:1px solid #e0e0e0; margin:24px 0;"/>
                <p style="color:#aaa; font-size:12px; margin:0;">
                  This is an automated reminder from Cognantic. Please do not reply to this email.
                </p>
              </div>
            </body>
            </html>
            """;
    }

    private async Task SendEmailAsync(string to, string name, string subject, string body)
    {
        var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");
        var smtpUser = _config["Email:Username"] ?? throw new InvalidOperationException("Email:Username not configured");
        var smtpPass = _config["Email:Password"] ?? throw new InvalidOperationException("Email:Password not configured");
        var fromAddr = _config["Email:FromAddress"] ?? smtpUser;
        var fromName = _config["Email:FromName"] ?? "Cognantic";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromAddr));
        message.To.Add(new MailboxAddress(name, to));
        message.Subject = subject;
        message.Body = new TextPart("html") { Text = body };

        using var client = new MailKit.Net.Smtp.SmtpClient();
        await client.ConnectAsync(smtpHost, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(smtpUser, smtpPass);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);

        _logger.LogInformation("Meet-link email sent to {Email}", to);
    }
}