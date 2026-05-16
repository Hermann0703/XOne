#!/bin/bash
# =============================================================================
# XOne 备份恢复脚本
# 用法: ./scripts/restore.sh <备份目录路径>
# 示例: ./scripts/restore.sh ./backups/2025-06-01_030000
# =============================================================================
set -euo pipefail

BACKUP_DIR="${1:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; }

if [ -z "$BACKUP_DIR" ]; then
    echo "用法: $0 <备份目录>"
    echo ""
    echo "可用的备份:"
    if [ -d ./backups ]; then
        ls -1dt ./backups/????-??-??_* 2>/dev/null || echo "  (无)"
    fi
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    err "备份目录不存在: $BACKUP_DIR"
    exit 1
fi

PG_DUMP="$BACKUP_DIR/postgres.dump"
MONGO_ARCHIVE="$BACKUP_DIR/mongo.archive"
MINIO_TAR="$BACKUP_DIR/minio.tar.gz"

# ─── 安全确认 ─────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════"
echo "  即将从以下备份恢复数据:"
echo "  $BACKUP_DIR"
echo ""
ls -lh "$PG_DUMP" "$MONGO_ARCHIVE" "$MINIO_TAR" 2>/dev/null || true
echo ""
echo "════════════════════════════════════════════════"
echo -e "${RED}⚠ 警告: 这会覆盖当前数据库中的所有数据!${NC}"
echo ""
read -rp "确认恢复? 输入 'yes' 继续: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "已取消"
    exit 0
fi

TMPDIR="/tmp/xone-restore-$$"
mkdir -p "$TMPDIR"
trap "rm -rf '$TMPDIR'" EXIT

# ─── 1. 恢复 PostgreSQL ─────────────────────────────
if [ -f "$PG_DUMP" ]; then
    log "恢复 PostgreSQL …"
    
    # 断开其他连接
    docker exec xone-postgres psql -U xone -d postgres \
        -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'xone' AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    # 删除并重建数据库
    docker exec xone-postgres dropdb -U xone --if-exists xone 2>/dev/null || true
    docker exec xone-postgres createdb -U xone xone 2>/dev/null || true
    
    # 恢复
    if docker exec -i xone-postgres pg_restore -U xone -d xone --no-owner --no-privileges --clean --if-exists \
        < "$PG_DUMP" 2>"$BACKUP_DIR/pg_restore.log"; then
        log "  ✓ PostgreSQL 恢复完成"
    else
        err "  ✗ PostgreSQL 恢复失败! 查看 $BACKUP_DIR/pg_restore.log"
        exit 1
    fi
else
    warn "  跳过 PostgreSQL (无备份文件)"
fi

# ─── 2. 恢复 MongoDB ────────────────────────────────
if [ -f "$MONGO_ARCHIVE" ]; then
    log "恢复 MongoDB …"
    
    # 删除旧数据库
    docker exec xone-mongodb mongosh --quiet \
        --username admin --password xone_prod_mongo_2026 \
        --authenticationDatabase admin \
        --eval "db.getSiblingDB('xone').dropDatabase()" 2>/dev/null || true
    
    # 恢复
    if docker exec -i xone-mongodb mongorestore --archive --drop \
        --username admin --password xone_prod_mongo_2026 \
        --authenticationDatabase admin \
        < "$MONGO_ARCHIVE" 2>"$BACKUP_DIR/mongo_restore.log"; then
        log "  ✓ MongoDB 恢复完成"
    else
        warn "  ⚠ MongoDB 恢复失败 (查看 $BACKUP_DIR/mongo_restore.log)"
    fi
else
    warn "  跳过 MongoDB (无备份文件)"
fi

# ─── 3. 恢复 MinIO 文件 ─────────────────────────────
if [ -f "$MINIO_TAR" ]; then
    log "恢复 MinIO 文件 …"
    
    tar -xzf "$MINIO_TAR" -C "$TMPDIR" 2>/dev/null
    
    # 清空容器内 /data
    docker exec xone-minio sh -c 'rm -rf /data/*' 2>/dev/null || true
    
    # 复制回容器
    if docker cp "$TMPDIR/." xone-minio:/data/ 2>"$BACKUP_DIR/minio_restore.log"; then
        log "  ✓ MinIO 恢复完成"
    else
        warn "  ⚠ MinIO 恢复失败 (查看 $BACKUP_DIR/minio_restore.log)"
    fi
else
    warn "  跳过 MinIO (无备份文件)"
fi

# ─── 4. 重启依赖服务 ────────────────────────────────
log "重启后端服务以重建连接 …"
docker compose -f docker/docker-compose.prod.yml restart backend celery celery-beat 2>/dev/null || true

echo ""
echo "══════════════════════════════════════════════"
echo "  恢复完成"
echo "  ⚠ 建议: 执行迁移确认版本一致:"
echo "    docker exec xone-backend alembic upgrade head"
echo "══════════════════════════════════════════════"
