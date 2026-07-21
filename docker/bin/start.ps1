# Merline - Start Development Environment (PowerShell)
$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

Write-Host "Starting Merline development environment..." -ForegroundColor Yellow

Set-Location $ProjectDir
docker compose -f docker/docker-compose.yml up -d

Write-Host "`nAll services started:" -ForegroundColor Green
Write-Host "  API:       http://localhost:8080" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  MinIO:     http://localhost:9001" -ForegroundColor White
Write-Host "  Mailpit:   http://localhost:8025" -ForegroundColor White
Write-Host "`nRun 'docker compose -f docker/docker-compose.yml logs -f' to follow logs" -ForegroundColor Gray
