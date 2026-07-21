#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "========================================"
echo "  Merline - Database Reset"
echo "========================================"

cd "$PROJECT_DIR"

# 1. Drop and recreate database
echo ""
echo "[1/3] Dropping and recreating database..."
docker compose -f docker/docker-compose.yml exec postgres psql -U merline -c "DROP DATABASE IF EXISTS merline;"
docker compose -f docker/docker-compose.yml exec postgres psql -U merline -c "CREATE DATABASE merline;"

# 2. Run migrations
echo ""
echo "[2/3] Running migrations..."
docker compose -f docker/docker-compose.yml run --rm api php artisan migrate --force

# 3. Seed database
echo ""
echo "[3/3] Seeding database..."
docker compose -f docker/docker-compose.yml run --rm api php artisan db:seed --force

echo ""
echo "Database reset complete!"
echo ""
