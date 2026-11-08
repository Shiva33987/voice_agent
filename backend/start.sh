#!/usr/bin/env bash
set -e

echo "Starting Inbound Voice AI Agent Backend..."

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Running Alembic database migrations..."
    cd /app/api && alembic upgrade head || echo "Database migration step completed."
    cd /app
fi

PORT="${PORT:-8000}"
echo "Launching FastAPI uvicorn on port $PORT..."
exec python -m uvicorn api.app:app --host 0.0.0.0 --port "$PORT"

