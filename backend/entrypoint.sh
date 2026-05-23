#!/bin/bash
set -e

echo "=== Canterlot Site — Docker Entrypoint ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL ($PG_HOST:$PG_PORT)..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

# Initialize database and seed data
echo "Running database initialization..."
python init_db.py

# Start the application (logs to stdout + file)
echo "Starting FastAPI server..."
uvicorn app:app --host 0.0.0.0 --port 8000 2>&1 | tee /app/log/server.log
