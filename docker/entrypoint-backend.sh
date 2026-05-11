#!/usr/bin/env bash
# =============================================================================
# XOne — Backend 容器入口脚本
# 功能: 等待 PostgreSQL 就绪 → 执行数据库迁移 → 启动 Uvicorn
# =============================================================================
set -euo pipefail

# ---- 等待 PostgreSQL 就绪 ----
echo "[entrypoint] 等待 PostgreSQL 就绪 ..."
MAX_RETRIES=30
RETRY_COUNT=0

until pg_isready -h postgres -U "${POSTGRES_USER:-xone}" -d "${POSTGRES_DB:-xone}" -q 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "[entrypoint] ERROR: PostgreSQL 在 ${MAX_RETRIES} 次尝试后仍未就绪"
        exit 1
    fi
    echo "[entrypoint] PostgreSQL 未就绪，等待中... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done
echo "[entrypoint] PostgreSQL 就绪 ✓"

# ---- 执行数据库迁移 ----
echo "[entrypoint] 执行数据库迁移 ..."
if [ -f alembic.ini ]; then
    alembic upgrade head
    echo "[entrypoint] 数据库迁移完成 ✓"
else
    echo "[entrypoint] WARNING: alembic.ini 未找到，跳过迁移"
fi

# ---- 启动 Uvicorn ----
WEB_CONCURRENCY="${WEB_CONCURRENCY:-4}"
echo "[entrypoint] 启动 Uvicorn (workers=${WEB_CONCURRENCY}) ..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers "${WEB_CONCURRENCY}" \
    --proxy-headers \
    --forwarded-allow-ips '*' \
    --no-access-log \
    --timeout-keep-alive 30
