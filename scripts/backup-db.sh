#!/usr/bin/env bash
# =============================================================================
# XOne — PostgreSQL 数据库备份脚本
# =============================================================================
# 用法:
#   bash scripts/backup-db.sh              # 使用 docker-compose 生产环境备份
#   bash scripts/backup-db.sh --dev        # 使用开发环境备份
#   bash scripts/backup-db.sh --local      # 使用本地 PostgreSQL (非 Docker)
# =============================================================================
set -euo pipefail

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]${NC} $*"; }
log_step()  { echo -e "\n${BLUE}============================================================${NC}"; echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ▶ $*${NC}"; echo -e "${BLUE}============================================================${NC}"; }

# ---- 路径配置 ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
COMPOSE_DEV="$PROJECT_DIR/docker/docker-compose.yml"
COMPOSE_PROD="$PROJECT_DIR/docker/docker-compose.prod.yml"
ENV_PROD="$PROJECT_DIR/.env.production"
ENV_DEV="$PROJECT_DIR/.env.dev"

# ---- 参数解析 ----
MODE="prod"
for arg in "$@"; do
    case $arg in
        --dev)   MODE="dev" ;;
        --local) MODE="local" ;;
        --help|-h)
            echo "XOne 数据库备份脚本"
            echo ""
            echo "用法: bash scripts/backup-db.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --dev     使用开发环境 docker-compose"
            echo "  --local   使用本地 PostgreSQL (非 Docker，从 .env 读取连接)"
            echo "  --help    显示此帮助信息"
            echo ""
            echo "默认使用生产环境 docker-compose。"
            echo "备份文件: xone_backup_YYYYMMDD_HHMMSS.sql.gz"
            echo "备份目录: $BACKUP_DIR"
            echo "自动清理: 保留最近 7 天的备份"
            exit 0
            ;;
        *)
            log_error "未知参数: $arg"
            echo "使用 --help 查看可用选项"
            exit 1
            ;;
    esac
done

# ---- 创建备份目录 ----
mkdir -p "$BACKUP_DIR"

# ---- 生成备份文件名 ----
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/xone_backup_${TIMESTAMP}.sql.gz"

log_step "开始数据库备份 (模式: $MODE)"
log_info "备份文件: $BACKUP_FILE"

# ---- 根据模式确定连接参数 ----
PG_USER="xone"
PG_DB="xone"
PG_HOST=""
PG_PORT=""
PG_PASSWORD=""

if [ "$MODE" = "local" ]; then
    # 从 .env 或 .env.dev 读取 DATABASE_URL
    ENV_FILE=""
    if [ -f "$PROJECT_DIR/.env" ]; then
        ENV_FILE="$PROJECT_DIR/.env"
    elif [ -f "$ENV_DEV" ]; then
        ENV_FILE="$ENV_DEV"
    fi

    if [ -n "$ENV_FILE" ]; then
        log_info "从 $ENV_FILE 读取数据库配置..."
        set -a
        source "$ENV_FILE" 2>/dev/null || true
        set +a
    fi

    # 解析 DATABASE_URL: postgresql+asyncpg://user:pass@host:port/db
    if [ -n "${DATABASE_URL:-}" ]; then
        # 移除 asyncpg 前缀
        CLEAN_URL="${DATABASE_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"
        
        # 解析 URL 各部分
        # 格式: postgresql://user:pass@host:port/db
        PG_USER=$(echo "$CLEAN_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
        PG_PASSWORD=$(echo "$CLEAN_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        PG_HOST=$(echo "$CLEAN_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
        PG_PORT=$(echo "$CLEAN_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
        PG_DB=$(echo "$CLEAN_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
        
        PG_PORT="${PG_PORT:-5432}"
    fi

    # 执行本地 pg_dump
    log_info "执行本地 PostgreSQL 备份..."
    log_info "  用户: $PG_USER, 数据库: $PG_DB, 主机: ${PG_HOST:-localhost}:$PG_PORT"

    PGPASSWORD="$PG_PASSWORD" pg_dump \
        -h "${PG_HOST:-localhost}" \
        -p "$PG_PORT" \
        -U "$PG_USER" \
        -d "$PG_DB" \
        --no-owner \
        --no-acl \
        2>&1 | gzip > "$BACKUP_FILE"

    DUMP_EXIT_CODE=${PIPESTATUS[0]}

elif [ "$MODE" = "dev" ]; then
    COMPOSE_FILE="$COMPOSE_DEV"
    ENV_FILE="$ENV_DEV"
    
    # 加载 dev 环境变量
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE" 2>/dev/null || true
        set +a
    fi
    
    cd "$PROJECT_DIR"

    # 检查 postgres 服务是否运行
    if ! docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "Up\|running"; then
        log_error "PostgreSQL 容器未运行，请先启动开发环境:"
        log_error "  docker compose -f $COMPOSE_FILE up -d postgres"
        exit 1
    fi

    log_info "通过 Docker Compose (开发环境) 执行备份..."
    
    PG_USER="${POSTGRES_USER:-xone}"
    PG_DB="${POSTGRES_DB:-xone}"

    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --no-acl 2>&1 | gzip > "$BACKUP_FILE"

    DUMP_EXIT_CODE=${PIPESTATUS[0]}

else
    # 生产模式
    COMPOSE_FILE="$COMPOSE_PROD"
    
    # 加载生产环境变量
    if [ -f "$ENV_PROD" ]; then
        set -a
        source "$ENV_PROD" 2>/dev/null || true
        set +a
    fi

    cd "$PROJECT_DIR"

    # 检查 postgres 服务是否运行
    if ! docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "Up\|running"; then
        log_error "PostgreSQL 容器未运行，请先启动生产环境:"
        log_error "  docker compose -f $COMPOSE_FILE up -d postgres"
        exit 1
    fi

    log_info "通过 Docker Compose (生产环境) 执行备份..."

    PG_USER="${POSTGRES_USER:-xone}"
    PG_DB="${POSTGRES_DB:-xone}"

    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        pg_dump -U "$PG_USER" -d "$PG_DB" --no-owner --no-acl 2>&1 | gzip > "$BACKUP_FILE"

    DUMP_EXIT_CODE=${PIPESTATUS[0]}
fi

# ---- 检查备份结果 ----
if [ "$DUMP_EXIT_CODE" -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_info "备份成功！"
    log_info "  文件: $BACKUP_FILE"
    log_info "  大小: $BACKUP_SIZE"
else
    log_error "备份失败！pg_dump 退出码: $DUMP_EXIT_CODE"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# ---- 清理旧备份 (保留最近 7 天) ----
log_step "清理超过 7 天的旧备份..."

DELETED_COUNT=0
for old_backup in "$BACKUP_DIR"/xone_backup_*.sql.gz; do
    [ -e "$old_backup" ] || continue
    
    # 跳过当前刚创建的备份
    if [ "$old_backup" = "$BACKUP_FILE" ]; then
        continue
    fi

    # 提取文件名中的日期 (格式: xone_backup_YYYYMMDD_HHMMSS.sql.gz)
    BACKUP_BASENAME=$(basename "$old_backup")
    BACKUP_DATE_STR=$(echo "$BACKUP_BASENAME" | sed -n 's/xone_backup_\([0-9]\{8\}\)_.*/\1/p')
    
    if [ -z "$BACKUP_DATE_STR" ]; then
        continue
    fi

    # 计算文件年龄（天数）
    BACKUP_DATE=$(date -j -f "%Y%m%d" "$BACKUP_DATE_STR" "+%s" 2>/dev/null || date -d "$BACKUP_DATE_STR" "+%s" 2>/dev/null)
    CURRENT_DATE=$(date "+%s")
    AGE_DAYS=$(( (CURRENT_DATE - BACKUP_DATE) / 86400 ))

    if [ "$AGE_DAYS" -gt 7 ]; then
        log_info "删除旧备份 (${AGE_DAYS} 天前): $(basename "$old_backup")"
        rm -f "$old_backup"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done

if [ "$DELETED_COUNT" -eq 0 ]; then
    log_info "没有需要清理的旧备份"
else
    log_info "已清理 $DELETED_COUNT 个旧备份"
fi

# ---- 列出当前备份 ----
log_step "当前备份列表:"
ls -lh "$BACKUP_DIR"/xone_backup_*.sql.gz 2>/dev/null || log_warn "暂无备份文件"

log_info "备份任务完成 ✓"
