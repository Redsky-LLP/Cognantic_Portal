# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Cognantic.server/Cognantic.API/Cognantic.API.csproj Cognantic.server/Cognantic.API/
COPY Cognantic.server/Cognantic.Application/Cognantic.Application.csproj Cognantic.server/Cognantic.Application/
COPY Cognantic.server/Cognantic.Domain/Cognantic.Domain.csproj Cognantic.server/Cognantic.Domain/
COPY Cognantic.server/Cognantic.Infrastucture/Cognantic.Infrastructure.csproj Cognantic.server/Cognantic.Infrastucture/

RUN dotnet restore Cognantic.server/Cognantic.API/Cognantic.API.csproj

COPY Cognantic.server/ Cognantic.server/

RUN dotnet publish Cognantic.server/Cognantic.API/Cognantic.API.csproj -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "Cognantic.API.dll"]