FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the server project
COPY Cognantic.server/ Cognantic.server/

# Restore dependencies
RUN dotnet restore "Cognantic.server/Cognantic.API/Cognantic.API.csproj"

# Build and publish
RUN dotnet publish "Cognantic.server/Cognantic.API/Cognantic.API.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000

ENTRYPOINT ["dotnet", "Cognantic.API.dll"]
