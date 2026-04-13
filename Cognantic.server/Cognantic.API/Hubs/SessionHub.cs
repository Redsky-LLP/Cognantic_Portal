using Microsoft.AspNetCore.SignalR;

namespace Cognantic.API.Hubs;

/// <summary>
/// Each connected client calls JoinSession(sessionId) on connect.
/// The server tracks which ConnectionId belongs to which sessionId + role.
/// </summary>
public class SessionHub : Hub
{
    // sessionId → (patientConnectionId, clinicianConnectionId)
    private static readonly Dictionary<string, (string? Patient, string? Clinician)>
        _rooms = new();

    private static readonly object _lock = new();

    public async Task JoinSession(string sessionId, string role)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);

        lock (_lock)
        {
            _rooms.TryGetValue(sessionId, out var room);
            if (role == "patient")
                _rooms[sessionId] = (Context.ConnectionId, room.Clinician);
            else
                _rooms[sessionId] = (room.Patient, Context.ConnectionId);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        lock (_lock)
        {
            foreach (var key in _rooms.Keys.ToList())
            {
                var r = _rooms[key];
                if (r.Patient == Context.ConnectionId)
                    _rooms[key] = (null, r.Clinician);
                else if (r.Clinician == Context.ConnectionId)
                    _rooms[key] = (r.Patient, null);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    // Called by clinician browser: Accept or Decline the extension
    public async Task RespondToExtension(string sessionId, bool accepted, string extensionId)
    {
        string? patientConn;
        lock (_lock)
        {
            _rooms.TryGetValue(sessionId, out var r);
            patientConn = r.Patient;
        }

        if (patientConn != null)
            await Clients.Client(patientConn)
                .SendAsync("ExtensionResponse", new { accepted, extensionId });
    }

    /// <summary>Helper: get clinician connection for a session (used by background service)</summary>
    public static string? GetClinicianConnection(string sessionId)
    {
        lock (_lock)
        {
            return _rooms.TryGetValue(sessionId, out var r) ? r.Clinician : null;
        }
    }

    /// <summary>Helper: get patient connection for a session (used by background service)</summary>
    public static string? GetPatientConnection(string sessionId)
    {
        lock (_lock)
        {
            return _rooms.TryGetValue(sessionId, out var r) ? r.Patient : null;
        }
    }
}