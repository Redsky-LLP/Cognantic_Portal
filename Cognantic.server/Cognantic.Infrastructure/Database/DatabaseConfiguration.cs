using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Cognantic.Infrastructure.Database;

public static class DatabaseConfiguration
{
    public enum DatabaseProvider
    {
        PostgreSQL,
        SqlServer,
        MySql,
        Sqlite
    }

    public static DatabaseProvider GetProvider(string provider)
    {
        return provider?.ToLower() switch
        {
            "postgresql" or "postgres" or "npgsql" => DatabaseProvider.PostgreSQL,
            "sqlserver" or "mssql" => DatabaseProvider.SqlServer,
            "mysql" or "mariadb" => DatabaseProvider.MySql,
            "sqlite" => DatabaseProvider.Sqlite,
            _ => DatabaseProvider.PostgreSQL
        };
    }

    public static void ConfigureDatabase(DbContextOptionsBuilder options,
        string connectionString,
        DatabaseProvider provider,
        IConfiguration? configuration = null)
    {
        switch (provider)
        {
            case DatabaseProvider.PostgreSQL:
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.CommandTimeout(120);
                    npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                    npgsqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
                });
                break;

            case DatabaseProvider.SqlServer:
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.CommandTimeout(120);
                    sqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                    sqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "dbo");
                });
                break;

            case DatabaseProvider.MySql:
                options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString), mysqlOptions =>
                {
                    mysqlOptions.CommandTimeout(120);
                    mysqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                    mysqlOptions.MigrationsHistoryTable("__EFMigrationsHistory", "public");
                });
                break;

            case DatabaseProvider.Sqlite:
                options.UseSqlite(connectionString, sqliteOptions =>
                {
                    sqliteOptions.CommandTimeout(120);
                    sqliteOptions.MigrationsHistoryTable("__EFMigrationsHistory");
                });
                break;
        }
    }
}