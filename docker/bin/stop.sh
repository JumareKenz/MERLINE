#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Stopping Merline development environment..."

cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.yml down

echo "All services stopped."
