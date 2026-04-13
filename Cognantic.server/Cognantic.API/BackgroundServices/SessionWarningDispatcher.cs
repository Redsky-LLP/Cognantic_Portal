using Cognantic.API.Hubs;
using Cognantic.Infrastructure.Persistence;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Cognantic.API.BackgroundServices;

public class SessionWarningDispatcher : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<SessionHub> _hub;
    private readonly ILogger<SessionWarningDispatcher> _logger;

    public SessionWarningDispatcher(
        IServiceScopeFactory scopeFactory,
        IHubContext<SessionHub> hub,
        ILogger<SessionWarningDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _hub = hub;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SessionWarningDispatcher started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try { await DispatchWarningsAsync(stoppingToken); }
            catch (Exception ex)
            { _logger.LogError(ex, "SessionWarningDispatcher error."); }

            // Poll every 30 seconds — fine-grained enough for a 5-min window
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task DispatchWarningsAsync(CancellationToken ct)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CognanticDbContext>();

        var now = DateTime.UtcNow;

        // Sessions that are InProgress and whose ScheduledEndTime is 4–6 mins away
        // and haven't already had a warning sent (reuse LinkSentAt pattern —
        // we add a WarningsSentAt field to Session, or just check ExtendedMinutes
        // to keep migration minimal: warn when (now + 5min) >= ScheduledEndTime
        var sessions = await db.Sessions
            .Where(s =>
                s.Status == "InProgress" &&
                s.IsActive &&
                s.ScheduledEndTime >= now.AddMinutes(4) &&
                s.ScheduledEndTime <= now.AddMinutes(6))
            .Select(s => new
            {
                s.SessionId,
                s.PatientId,
                s.ClinicianId,
                s.ScheduledEndTime,
                s.Amount,
                HourlyRate = s.Clinician.HourlyRate
            })
            .ToListAsync(ct);

        foreach (var s in sessions)
        {
            var sessionIdStr = s.SessionId.ToString();

            // Cost preview so patient sees it in the popup
            var rate = s.HourlyRate ?? (s.Amount / 60m * 60m);
            var cost10 = Math.Round(rate / 6m, 2);   // 10 min = 1/6 hr
            var cost15 = Math.Round(rate / 4m, 2);   // 15 min = 1/4 hr

            var patientConn = SessionHub.GetPatientConnection(sessionIdStr);
            var clinicianConn = SessionHub.GetClinicianConnection(sessionIdStr);

            if (patientConn != null)
                await _hub.Clients.Client(patientConn).SendAsync(
                    "SessionEndingWarning",
                    new { sessionId = sessionIdStr, minutesRemaining = 5, cost10, cost15 },
                    ct);

            _logger.LogInformation(
                "5-min warning sent for session {SessionId}.", s.SessionId);
        }
    }
}