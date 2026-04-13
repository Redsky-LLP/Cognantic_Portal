using Cognantic.API.BackgroundServices;
using Cognantic.API.Hubs;
using Cognantic.API.Services;
using Cognantic.Application.Common;
using Cognantic.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add logging
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
});

// 1. JWT Authentication Setup
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
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "CognanticSuperSecretKey2026_MustBe32CharsOrMore!"))
    };
});

// 2. CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                builder.Configuration["AllowedOrigin"] ?? "https://your-app.netlify.app"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 3. Database Context & Factory
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

// Log the connection string (without sensitive data in production)
if (builder.Environment.IsDevelopment())
{
    Console.WriteLine($"Using connection string: {connectionString}");
}

builder.Services.AddDbContextFactory<CognanticDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(120);
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorCodesToAdd: null);
    }));

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

// 6. Swagger/OpenAPI for .NET 8
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Cognantic API", Version = "v1" });

    // Add JWT Authentication to Swagger
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

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Cognantic API v1");
        c.RoutePrefix = "";  // This makes Swagger load directly at root URL
    });
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapHub<SessionHub>("/hubs/session");
app.MapControllers();

// Apply migrations with retry logic and better error handling
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    try
    {
        var db = services.GetRequiredService<CognanticDbContext>();

        logger.LogInformation("Starting database migration...");

        // Retry logic for database connection
        int maxRetries = 5;
        int retryDelaySeconds = 5;

        for (int attempt = 1; attempt <= maxRetries; attempt++)
        {
            try
            {
                logger.LogInformation($"Attempt {attempt} of {maxRetries} to connect to database...");

                // Test connection first
                var canConnect = await db.Database.CanConnectAsync();
                if (!canConnect)
                {
                    logger.LogWarning("Cannot connect to database yet. Retrying...");
                    throw new Exception("Database connection failed");
                }

                // Apply migrations
                await db.Database.MigrateAsync();
                logger.LogInformation("Database migration completed successfully!");
                break;
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                logger.LogWarning(ex, $"Database migration attempt {attempt} failed. Retrying in {retryDelaySeconds} seconds...");
                await Task.Delay(retryDelaySeconds * 1000);
                retryDelaySeconds *= 2; // Exponential backoff
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Database migration failed after all retries. The application will continue but may not function correctly.");
                // Don't rethrow - let the app start anyway
            }
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while setting up the database. The application will continue but database features may not work.");
        // Don't throw - let the app start and retry on requests
    }
}

app.Run();