#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Starting Merline development environment..."

cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.yml up -d

echo ""
echo "All services started:"
echo "  API:       http://localhost:8080"
echo "  Frontend:  http://localhost:3000"
echo "  MinIO:     http://localhost:9001"
echo "  Mailpit:   http://localhost:8025"
echo ""
echo "Run 'docker compose -f docker/docker-compose.yml logs -f' to follow logs"
