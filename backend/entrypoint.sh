#!/bin/bash
set -e

echo "=== Canterlot Site — Docker Entrypoint ==="

# 等待 PostgreSQL 就绪
echo "Waiting for PostgreSQL ($PG_HOST:$PG_PORT)..."
until pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DATABASE" 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

# 初始化数据库并导入种子数据
echo "Running database initialization..."
python init_db.py

# 启动应用（日志由 Docker 日志驱动收集）
echo "Starting FastAPI server..."
exec uvicorn app:app --host 0.0.0.0 --port 8000
