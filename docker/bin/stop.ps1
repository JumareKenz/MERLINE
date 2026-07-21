# Merline - Stop Development Environment (PowerShell)
$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

Write-Host "Stopping Merline development environment..." -ForegroundColor Yellow

Set-Location $ProjectDir
docker compose -f docker/docker-compose.yml down

Write-Host "All services stopped." -ForegroundColor Green
