using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Cognantic.API.Services;

public class ZoomService
{
    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public ZoomService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    private async Task<string> GetAccessTokenAsync()
    {
        var accountId = _config["Zoom:AccountId"];
        var clientId = _config["Zoom:ClientId"];
        var clientSecret = _config["Zoom:ClientSecret"];

        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

        var request = new HttpRequestMessage(HttpMethod.Post, $"https://zoom.us/oauth/token?grant_type=account_credentials&account_id={accountId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);

        var response = await _http.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        return doc.RootElement.GetProperty("access_token").GetString()!;
    }

    public async Task<string> CreateMeetingAsync(string topic, DateTime startTime)
    {
        var token = await GetAccessTokenAsync();

        // ✅ FIX: Using HttpRequestMessage instead of DefaultRequestHeaders to ensure thread safety
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.api.zoom.us/v2/users/me/meetings");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var payload = new
        {
            topic = topic,
            type = 2,
            start_time = startTime.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ"),
            duration = 60,
            settings = new { join_before_host = true, waiting_room = false }
        };

        request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        return doc.RootElement.GetProperty("join_url").GetString()!;
    }
}