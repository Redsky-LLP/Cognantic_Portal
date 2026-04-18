using Cognantic.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Cognantic.Infrastructure.Database;

public interface IDatabaseFactory
{
    CognanticDbContext CreateDbContext();
}

public class DatabaseFactory : IDatabaseFactory
{
    private readonly IConfiguration _configuration;
    private readonly DatabaseConfiguration.DatabaseProvider _provider;
    private readonly string _connectionString;

    public DatabaseFactory(IConfiguration configuration)
    {
        _configuration = configuration;
        _provider = DatabaseConfiguration.GetProvider(
            configuration["Database:Provider"] ?? "postgresql");
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string not found");
    }

    public CognanticDbContext CreateDbContext()
    {
        var optionsBuilder = new DbContextOptionsBuilder<CognanticDbContext>();
        DatabaseConfiguration.ConfigureDatabase(optionsBuilder, _connectionString, _provider, _configuration);
        // ✅ FIX: Only pass options (matches your CognanticDbContext constructor)
        return new CognanticDbContext(optionsBuilder.Options);
    }
}