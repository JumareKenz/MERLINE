# Merline - First Time Setup (PowerShell)
$ProjectDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Merline - First Time Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Copy environment files
Write-Host "`n[1/7] Copying environment files..." -ForegroundColor Yellow
if (-not (Test-Path "$ProjectDir\.env")) {
    Copy-Item "$ProjectDir\.env.example" "$ProjectDir\.env"
    Write-Host "  Created .env from .env.example" -ForegroundColor Green
} else {
    Write-Host "  .env already exists, skipping" -ForegroundColor Gray
}

if (-not (Test-Path "$ProjectDir\apps\backend\.env")) {
    Copy-Item "$ProjectDir\apps\backend\.env.example" "$ProjectDir\apps\backend\.env"
    Write-Host "  Created apps/backend/.env from .env.example" -ForegroundColor Green
} else {
    Write-Host "  apps/backend/.env already exists, skipping" -ForegroundColor Gray
}

if (-not (Test-Path "$ProjectDir\apps\frontend\.env.local")) {
    Copy-Item "$ProjectDir\apps\frontend\.env.example" "$ProjectDir\apps\frontend\.env.local"
    Write-Host "  Created apps/frontend/.env.local from .env.example" -ForegroundColor Green
} else {
    Write-Host "  apps/frontend/.env.local already exists, skipping" -ForegroundColor Gray
}

# 2. Start Docker services
Write-Host "`n[2/7] Starting Docker services..." -ForegroundColor Yellow
Set-Location $ProjectDir
docker compose -f docker/docker-compose.yml up -d postgres redis minio mailpit
Write-Host "  Waiting for services to be healthy..." -ForegroundColor Gray
Start-Sleep -Seconds 10

# 3. Install backend dependencies
Write-Host "`n[3/7] Installing backend dependencies..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml run --rm api composer install --prefer-dist --no-interaction

# 4. Generate app key
Write-Host "`n[4/7] Generating application key..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml run --rm api php artisan key:generate

# 5. Run migrations
Write-Host "`n[5/7] Running database migrations..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml run --rm api php artisan migrate

# 6. Seed database
Write-Host "`n[6/7] Seeding database..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml run --rm api php artisan db:seed

# 7. Start all services
Write-Host "`n[7/7] Starting all services..." -ForegroundColor Yellow
docker compose -f docker/docker-compose.yml up -d

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n  API:       http://localhost:8080" -ForegroundColor White
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  MinIO:     http://localhost:9001 (minioadmin / minioadmin)" -ForegroundColor White
Write-Host "  Mailpit:   http://localhost:8025" -ForegroundColor White
Write-Host "  Redis:     localhost:6379" -ForegroundColor White
Write-Host "  Postgres:  localhost:5432" -ForegroundColor White
Write-Host "" -ForegroundColor White
