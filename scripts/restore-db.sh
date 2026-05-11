#!/usr/bin/env bash
# =============================================================================
# XOne — PostgreSQL 数据库恢复脚本
# =============================================================================
# 用法:
#   bash scripts/restore-db.sh <backup_file>            # 恢复指定备份
#   bash scripts/restore-db.sh --dev <backup_file>      # 使用开发环境恢复
#   bash scripts/restore-db.sh --local <backup_file>    # 使用本地 PostgreSQL 恢复
#   bash scripts/restore-db.sh --list                   # 列出可用备份文件
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
BACKUP_FILE=""
LIST_FLAG=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)   MODE="dev"; shift ;;
        --local) MODE="local"; shift ;;
        --list)  LIST_FLAG=true; shift ;;
        --help|-h)
            echo "XOne 数据库恢复脚本"
            echo ""
            echo "用法: bash scripts/restore-db.sh [选项] <备份文件路径>"
            echo ""
            echo "选项:"
            echo "  --dev     使用开发环境 docker-compose"
            echo "  --local   使用本地 PostgreSQL (非 Docker)"
            echo "  --list    列出所有可用备份文件"
            echo "  --help    显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  bash scripts/restore-db.sh backups/xone_backup_20260511_120000.sql.gz"
            echo "  bash scripts/restore-db.sh --dev backups/xone_backup_20260511_120000.sql.gz"
            echo "  bash scripts/restore-db.sh --list"
            echo ""
            echo "注意: 恢复操作会停止应用，恢复完成后自动重启。"
            exit 0
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# ---- 列出备份文件 ----
if $LIST_FLAG; then
    if [ -d "$BACKUP_DIR" ] && [ "$(ls -1 "$BACKUP_DIR"/xone_backup_*.sql.gz 2>/dev/null | wc -l)" -gt 0 ]; then
        echo ""
        echo -e "${BLUE}可用备份文件:${NC}"
        echo "─────────────────────────────────────────────────────────────"
        ls -lh "$BACKUP_DIR"/xone_backup_*.sql.gz 2>/dev/null | while read -r line; do
            echo "  $line"
        done
        echo "─────────────────────────────────────────────────────────────"
    else
        log_warn "没有找到备份文件 (目录: $BACKUP_DIR)"
    fi
    exit 0
fi

# ---- 验证备份文件 ----
if [ -z "$BACKUP_FILE" ]; then
    log_error "缺少备份文件参数！"
    echo ""
    echo "用法: bash scripts/restore-db.sh [选项] <备份文件路径>"
    echo "使用 --list 查看可用备份: bash scripts/restore-db.sh --list"
    exit 1
fi

# 支持相对路径和绝对路径
if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="$PROJECT_DIR/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "备份文件不存在: $BACKUP_FILE"
    echo ""
    echo "使用 --list 查看可用备份: bash scripts/restore-db.sh --list"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_BASENAME=$(basename "$BACKUP_FILE")

# ---- 检查备份文件是否为 gzip 格式 ----
if ! gzip -t "$BACKUP_FILE" 2>/dev/null; then
    log_warn "备份文件不是 gzip 压缩格式，将作为纯 SQL 处理"
    DECOMPRESS_CMD="cat"
else
    DECOMPRESS_CMD="gunzip -c"
fi

# ---- 确认提示 ----
log_step "数据库恢复确认"
echo ""
echo -e "  ${YELLOW}⚠  警告: 此操作将覆盖当前数据库中的所有数据！${NC}"
echo ""
echo -e "  恢复模式:     ${GREEN}$MODE${NC}"
echo -e "  备份文件:     ${GREEN}$BACKUP_BASENAME${NC}"
echo -e "  备份大小:     ${GREEN}$BACKUP_SIZE${NC}"
echo -e "  目标数据库:   ${YELLOW}将被完全覆盖${NC}"
echo ""

if [ "$MODE" = "dev" ]; then
    echo -e "  Docker 编排:  $COMPOSE_DEV"
elif [ "$MODE" = "prod" ]; then
    echo -e "  Docker 编排:  $COMPOSE_PROD"
else
    echo -e "  连接方式:     本地 PostgreSQL"
fi

echo ""
read -r -p "确认执行恢复? 输入 'yes' 继续: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "已取消恢复操作"
    exit 0
fi

# ---- 执行恢复 ----
if [ "$MODE" = "local" ]; then
    # ---- 本地模式 ----
    log_step "本地 PostgreSQL 恢复"

    # 从 .env 读取配置
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

    PG_USER="xone"
    PG_HOST="localhost"
    PG_PORT="5432"
    PG_DB="xone"
    PG_PASSWORD=""

    if [ -n "${DATABASE_URL:-}" ]; then
        CLEAN_URL="${DATABASE_URL/postgresql+asyncpg:\/\//postgresql:\/\/}"
        PG_USER=$(echo "$CLEAN_URL" | sed -n 's|.*://\([^:]*\):.*|\1|p')
        PG_PASSWORD=$(echo "$CLEAN_URL" | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
        PG_HOST=$(echo "$CLEAN_URL" | sed -n 's|.*@\([^:/]*\).*|\1|p')
        PG_PORT=$(echo "$CLEAN_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
        PG_DB=$(echo "$CLEAN_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
        PG_PORT="${PG_PORT:-5432}"
    fi

    log_info "目标: $PG_HOST:$PG_PORT/$PG_DB (用户: $PG_USER)"

    # 终止当前连接（需要超级用户权限）
    log_info "终止当前数据库连接..."
    PGPASSWORD="$PG_PASSWORD" psql \
        -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d postgres \
        -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$PG_DB' AND pid <> pg_backend_pid();" \
        2>/dev/null || true

    # 删除并重建数据库
    log_info "重建数据库..."
    PGPASSWORD="$PG_PASSWORD" dropdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" --if-exists 2>/dev/null || true
    PGPASSWORD="$PG_PASSWORD" createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" "$PG_DB" 2>/dev/null

    # 执行恢复
    log_info "恢复数据 (这可能需要几分钟)..."
    $DECOMPRESS_CMD "$BACKUP_FILE" | PGPASSWORD="$PG_PASSWORD" psql \
        -h "$PG_HOST" \
        -p "$PG_PORT" \
        -U "$PG_USER" \
        -d "$PG_DB" \
        --quiet \
        --single-transaction 2>&1

    RESTORE_EXIT_CODE=${PIPESTATUS[0]}

else
    # ---- Docker 模式 ----
    if [ "$MODE" = "dev" ]; then
        COMPOSE_FILE="$COMPOSE_DEV"
        ENV_FILE="$ENV_DEV"
    else
        COMPOSE_FILE="$COMPOSE_PROD"
        ENV_FILE="$ENV_PROD"
    fi

    # 加载环境变量
    if [ -f "$ENV_FILE" ]; then
        set -a
        source "$ENV_FILE" 2>/dev/null || true
        set +a
    fi

    PG_USER="${POSTGRES_USER:-xone}"
    PG_DB="${POSTGRES_DB:-xone}"

    cd "$PROJECT_DIR"

    # ---- 停止应用服务 ----
    log_step "停止后端应用服务..."
    
    SERVICES_TO_STOP="backend celery celery-beat"
    for svc in $SERVICES_TO_STOP; do
        if docker compose -f "$COMPOSE_FILE" ps "$svc" 2>/dev/null | grep -q "Up\|running"; then
            log_info "停止服务: $svc"
            docker compose -f "$COMPOSE_FILE" stop "$svc" 2>/dev/null || true
        fi
    done

    # 等待停止完成
    sleep 3

    # ---- 检查 PostgreSQL 是否运行 ----
    if ! docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "Up\|running"; then
        log_error "PostgreSQL 容器未运行，无法恢复！"
        log_error "请先启动 PostgreSQL: docker compose -f $COMPOSE_FILE up -d postgres"
        exit 1
    fi

    # ---- 终止活动连接 ----
    log_info "终止 PostgreSQL 活动连接..."
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        psql -U "$PG_USER" -d postgres \
        -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '$PG_DB' AND pid <> pg_backend_pid();" \
        2>/dev/null || true

    # ---- 删除并重建数据库 ----
    log_info "重建数据库..."
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        dropdb -U "$PG_USER" "$PG_DB" --if-exists 2>/dev/null || true
    
    docker compose -f "$COMPOSE_FILE" exec -T postgres \
        createdb -U "$PG_USER" "$PG_DB" 2>/dev/null

    # ---- 执行恢复 ----
    log_step "恢复数据 (这可能需要几分钟)..."
    log_info "从文件: $BACKUP_BASENAME"

    $DECOMPRESS_CMD "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres \
        psql -U "$PG_USER" -d "$PG_DB" --quiet --single-transaction 2>&1

    RESTORE_EXIT_CODE=${PIPESTATUS[0]}
fi

# ---- 检查恢复结果 ----
if [ "$RESTORE_EXIT_CODE" -eq 0 ]; then
    log_info ""
    log_info "✓ 数据库恢复成功！"
else
    log_error "数据库恢复失败！退出码: $RESTORE_EXIT_CODE"
    
    # Docker 模式下尝试重启服务
    if [ "$MODE" != "local" ]; then
        log_warn "请手动检查数据库状态后重启服务:"
        log_warn "  docker compose -f $COMPOSE_FILE up -d backend celery celery-beat"
    fi
    exit 1
fi

# ---- 重启应用服务 (Docker 模式) ----
if [ "$MODE" != "local" ]; then
    log_step "重启后端应用服务..."
    
    for svc in $SERVICES_TO_STOP; do
        if docker compose -f "$COMPOSE_FILE" ps -a "$svc" 2>/dev/null | grep -q "$svc"; then
            log_info "启动服务: $svc"
            docker compose -f "$COMPOSE_FILE" start "$svc" 2>/dev/null || \
                docker compose -f "$COMPOSE_FILE" up -d "$svc" 2>/dev/null || true
        fi
    done

    # 显示服务状态
    log_info "当前服务状态:"
    docker compose -f "$COMPOSE_FILE" ps 2>/dev/null || true
fi

log_info ""
log_info "恢复任务完成 ✓"
