using Cognantic.API.BackgroundServices;
using Cognantic.API.Hubs;
using Cognantic.API.Services;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using Cognantic.Infrastructure.Database;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
});

// 1. JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]
                ?? "CognanticSuperSecretKey2026_MustBe32CharsOrMore!"))
    };

    // For SignalR
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                context.Token = accessToken;
            return Task.CompletedTask;
        }
    };
});

// 2. CORS - Updated for Azure
var allowedOrigins = builder.Configuration["AllowedOrigins"]
    ?.Split(",", StringSplitOptions.RemoveEmptyEntries)
    ?? new[] {
        "http://localhost:5173",
        "https://localhost:5173",
        "https://cognantic-frontend.azurestaticapps.net"
    };

builder.Services.AddCors(options =>
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

// 3. Database - Provider Agnostic
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var databaseProvider = builder.Configuration["Database:Provider"] ?? "postgresql";
var dbProvider = DatabaseConfiguration.GetProvider(databaseProvider);

builder.Services.AddDbContextFactory<CognanticDbContext>((serviceProvider, options) =>
{
    DatabaseConfiguration.ConfigureDatabase(options, connectionString!, dbProvider, builder.Configuration);
});

builder.Services.AddScoped<CognanticDbContext>(sp =>
    sp.GetRequiredService<IDbContextFactory<CognanticDbContext>>().CreateDbContext());

builder.Services.AddSingleton<IDatabaseFactory, DatabaseFactory>();

builder.Services.AddHostedService<MeetLinkDispatcher>();
builder.Services.AddHttpClient<ZoomService>();
builder.Services.AddSignalR();
builder.Services.AddHostedService<SessionWarningDispatcher>();

// 4. MediatR
builder.Services.AddMediatR(cfg =>
{
    cfg.RegisterServicesFromAssemblies(
        typeof(Result<>).Assembly,
        typeof(Program).Assembly
    );
});

// 5. Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// 6. Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Cognantic API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter 'Bearer' followed by your token"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ✅ Auto-migrate on startup
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = services.GetRequiredService<CognanticDbContext>();
        logger.LogInformation("Starting database migration...");
        db.Database.Migrate();
        logger.LogInformation("Database migration completed!");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Database migration failed.");
    }
}

// ✅ Swagger always on
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Cognantic API v1");
    c.RoutePrefix = "";
});

// ✅ Correct middleware order
app.UseRouting();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapHub<SessionHub>("/hubs/session");
app.MapControllers();

app.Run();