#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "========================================"
echo "  Merline - First Time Setup"
echo "========================================"

# 1. Copy environment files
echo ""
echo "[1/7] Copying environment files..."
if [ ! -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
    echo "  Created .env from .env.example"
else
    echo "  .env already exists, skipping"
fi

if [ ! -f "$PROJECT_DIR/apps/backend/.env" ]; then
    cp "$PROJECT_DIR/apps/backend/.env.example" "$PROJECT_DIR/apps/backend/.env"
    echo "  Created apps/backend/.env from .env.example"
else
    echo "  apps/backend/.env already exists, skipping"
fi

if [ ! -f "$PROJECT_DIR/apps/frontend/.env.local" ]; then
    cp "$PROJECT_DIR/apps/frontend/.env.example" "$PROJECT_DIR/apps/frontend/.env.local"
    echo "  Created apps/frontend/.env.local from .env.example"
else
    echo "  apps/frontend/.env.local already exists, skipping"
fi

# 2. Start Docker services
echo ""
echo "[2/7] Starting Docker services..."
cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.yml up -d postgres redis minio mailpit
echo "  Waiting for services to be healthy..."
sleep 10

# 3. Install backend dependencies
echo ""
echo "[3/7] Installing backend dependencies..."
docker compose -f docker/docker-compose.yml run --rm api composer install --prefer-dist --no-interaction

# 4. Generate app key
echo ""
echo "[4/7] Generating application key..."
docker compose -f docker/docker-compose.yml run --rm api php artisan key:generate

# 5. Run migrations
echo ""
echo "[5/7] Running database migrations..."
docker compose -f docker/docker-compose.yml run --rm api php artisan migrate

# 6. Seed database
echo ""
echo "[6/7] Seeding database..."
docker compose -f docker/docker-compose.yml run --rm api php artisan db:seed

# 7. Start all services
echo ""
echo "[7/7] Starting all services..."
docker compose -f docker/docker-compose.yml up -d

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "  API:       http://localhost:8080"
echo "  Frontend:  http://localhost:3000"
echo "  MinIO:     http://localhost:9001 (minioadmin / minioadmin)"
echo "  Mailpit:   http://localhost:8025"
echo "  Redis:     localhost:6379"
echo "  Postgres:  localhost:5432"
echo ""
