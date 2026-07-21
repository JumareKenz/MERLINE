# Merline - Database Reset (PowerShell)
$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Merline - Database Reset" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Set-Location $ProjectDir

# 1. Drop and recreate database
Write-Host "`n[1/3] Dropping and recreating database..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml exec -T postgres psql -U merline -c "DROP DATABASE IF EXISTS merline;"
docker compose -f docker/docker-compose.yml exec -T postgres psql -U merline -c "CREATE DATABASE merline;"

# 2. Run migrations
Write-Host "`n[2/3] Running migrations..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml run --rm api php artisan migrate --force

# 3. Seed database
Write-Host "`n[3/3] Seeding database..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml run --rm api php artisan db:seed --force

Write-Host "`nDatabase reset complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
