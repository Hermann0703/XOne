#!/bin/bash
# =============================================================================
# XOne 全量数据备份脚本
# 备份范围: PostgreSQL + MongoDB + MinIO 文件
# Redis/Meilisearch/Qdrant 可重建, 不备份
# =============================================================================
set -euo pipefail

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
KEEP_DAYS=${BACKUP_KEEP_DAYS:-7}
TMPDIR="/tmp/xone-backup-$$"

# 凭据 — 从 docker-compose 的默认值/容器 env 读取
PG_USER="${PG_USER:-xone}"
PG_DB="${PG_DB:-xone}"
PG_CONTAINER="${PG_CONTAINER:-xone-postgres}"
MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASSWORD="${MONGO_PASSWORD:-xone_prod_mongo_2026}"
MONGO_DB="${MONGO_DB:-xone}"
MONGO_CONTAINER="${MONGO_CONTAINER:-xone-mongodb}"
MINIO_CONTAINER="${MINIO_CONTAINER:-xone-minio}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERR]${NC} $*"; }

mkdir -p "$BACKUP_DIR" "$TMPDIR"
trap "rm -rf '$TMPDIR'" EXIT

# ─── 1. PostgreSQL 逻辑备份 (custom format, 压缩) ─────
log "备份 PostgreSQL ($PG_DB) …"
if docker exec "$PG_CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" \
    --format=custom --compress=9 --no-owner --no-privileges \
    > "$BACKUP_DIR/postgres.dump" 2>"$BACKUP_DIR/pg_dump.log"; then
    PG_SIZE=$(du -h "$BACKUP_DIR/postgres.dump" | cut -f1)
    log "  ✓ PostgreSQL 备份完成 ($PG_SIZE)"
else
    err "  ✗ PostgreSQL 备份失败! 查看 $BACKUP_DIR/pg_dump.log"
fi

# ─── 2. MongoDB 逻辑备份 (archive 格式) ──────────────
log "备份 MongoDB ($MONGO_DB) …"
if docker exec "$MONGO_CONTAINER" mongodump \
    --db "$MONGO_DB" --archive \
    --username "$MONGO_USER" --password "$MONGO_PASSWORD" \
    --authenticationDatabase admin \
    > "$BACKUP_DIR/mongo.archive" 2>"$BACKUP_DIR/mongo_dump.log"; then
    MONGO_SIZE=$(du -h "$BACKUP_DIR/mongo.archive" | cut -f1)
    log "  ✓ MongoDB 备份完成 ($MONGO_SIZE)"
else
    warn "  ⚠ MongoDB 备份失败或无数据 (查看 $BACKUP_DIR/mongo_dump.log)"
fi

# ─── 3. MinIO 文件备份 (docker cp + host tar) ───────
log "备份 MinIO 文件 …"
if docker cp "$MINIO_CONTAINER:/data/." "$TMPDIR/minio_data" 2>"$BACKUP_DIR/minio_backup.log"; then
    tar -czf "$BACKUP_DIR/minio.tar.gz" -C "$TMPDIR/minio_data" . 2>>"$BACKUP_DIR/minio_backup.log"
    MINIO_SIZE=$(du -h "$BACKUP_DIR/minio.tar.gz" | cut -f1)
    log "  ✓ MinIO 备份完成 ($MINIO_SIZE)"
else
    warn "  ⚠ MinIO 备份失败 (查看 $BACKUP_DIR/minio_backup.log)"
fi

# ─── 4. 生成备份元信息 ───────────────────────────────
cat > "$BACKUP_DIR/meta.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname)",
  "postgres_db": "$PG_DB",
  "postgres_size": "${PG_SIZE:-unknown}",
  "mongo_db": "$MONGO_DB",
  "mongo_size": "${MONGO_SIZE:-unknown}",
  "minio_size": "${MINIO_SIZE:-unknown}",
  "git_commit": "$(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
}
EOF

log "备份元信息已写入 $BACKUP_DIR/meta.json"

# ─── 5. 清理过期备份 (保留最近 N 天) ─────────────────
log "清理 ${KEEP_DAYS} 天前的旧备份 …"
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +"$KEEP_DAYS" \
    -name "????-??-??_*" -exec rm -rf {} \; -print 2>/dev/null || true
log "过期备份已清理"

# ─── 6. 输出摘要 ────────────────────────────────────
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "══════════════════════════════════════════════"
echo "  备份完成: $TIMESTAMP"
echo "  存放路径: $BACKUP_DIR"
echo "  总大小:   $TOTAL_SIZE"
echo "══════════════════════════════════════════════"
