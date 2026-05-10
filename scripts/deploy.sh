#!/usr/bin/env bash
# =============================================================================
# XOne — 一键生产部署脚本
# =============================================================================
# 用法:
#   bash scripts/deploy.sh              # 标准部署
#   bash scripts/deploy.sh --ssl        # 部署 + 申请 Let's Encrypt 证书
#   bash scripts/deploy.sh --backup     # 仅备份数据
#   bash scripts/deploy.sh --restart    # 重启所有服务
#   bash scripts/deploy.sh --logs       # 查看服务日志
# =============================================================================
set -euo pipefail

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "\n${BLUE}============================================================${NC}"; echo -e "${BLUE}▶ $*${NC}"; echo -e "${BLUE}============================================================${NC}"; }

# ---- 路径配置 ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"
COMPOSE_FILE="docker/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
ENV_EXAMPLE="$PROJECT_DIR/.env.example"
BACKUP_DIR="$PROJECT_DIR/backups"
SSL_FLAG=false
BACKUP_FLAG=false
RESTART_FLAG=false
LOGS_FLAG=false

# ---- 解析参数 ----
for arg in "$@"; do
    case $arg in
        --ssl)     SSL_FLAG=true ;;
        --backup)  BACKUP_FLAG=true ;;
        --restart) RESTART_FLAG=true ;;
        --logs)    LOGS_FLAG=true ;;
        --help|-h)
            echo "XOne 部署脚本"
            echo "用法: bash scripts/deploy.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --ssl       部署并通过 Let's Encrypt 申请 SSL 证书"
            echo "  --backup    仅执行数据备份"
            echo "  --restart   重启所有生产服务"
            echo "  --logs      查看所有服务日志 (Ctrl+C 退出)"
            echo "  --help      显示此帮助信息"
            exit 0
            ;;
        *)
            log_error "未知参数: $arg"
            echo "使用 --help 查看可用选项"
            exit 1
            ;;
    esac
done

# =============================================================================
# 仅备份模式
# =============================================================================
if $BACKUP_FLAG; then
    log_step "执行数据备份"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-xone}" "${POSTGRES_DB:-xone}" \
        > "$BACKUP_DIR/postgres_${TIMESTAMP}.sql" 2>/dev/null || log_warn "PostgreSQL 备份跳过 (可能服务未运行)"
    
    log_info "备份完成: $BACKUP_DIR"
    ls -lh "$BACKUP_DIR" 2>/dev/null || true
    exit 0
fi

# =============================================================================
# 仅日志模式
# =============================================================================
if $LOGS_FLAG; then
    log_step "查看服务日志"
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" logs -f --tail=100
    exit 0
fi

# =============================================================================
# 仅重启模式
# =============================================================================
if $RESTART_FLAG; then
    log_step "重启所有生产服务"
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" restart
    log_info "服务已重启"
    docker compose -f "$COMPOSE_FILE" ps
    exit 0
fi

# =============================================================================
# 标准部署流程
# =============================================================================

log_step "XOne 生产环境部署开始"

# ---- 1. 检查环境变量文件 ----
log_info "检查 .env.production ..."
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        log_warn ".env.production 不存在，从 .env.example 复制..."
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        log_warn "=============================================="
        log_warn "请编辑 .env.production 填写生产环境配置！"
        log_warn "尤其是: SECRET_KEY, 各数据库密码, DOMAIN"
        log_warn ""
        log_warn "文件路径: $ENV_FILE"
        log_warn "=============================================="
        log_warn ""
        read -r -p "编辑完成后按 Enter 继续部署... " dummy
    else
        log_error ".env.example 也不存在，无法继续。"
        exit 1
    fi
fi

# 加载环境变量
set -a
source "$ENV_FILE" 2>/dev/null || true
set +a

# ---- 2. 验证必要环境变量 ----
log_step "验证 .env.production 配置"

VALIDATION_ERRORS=0

# SECRET_KEY
if [ -z "${SECRET_KEY:-}" ] || [[ "$SECRET_KEY" =~ ^change-me ]]; then
    log_error "SECRET_KEY 未设置或仍为默认值，请在 .env.production 中修改！"
    log_info "生成随机密钥: openssl rand -hex 32"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# DOMAIN
if [ -z "${DOMAIN:-}" ] || [ "$DOMAIN" = "example.com" ]; then
    log_error "DOMAIN 未设置或仍为 example.com，请在 .env.production 中设置真实域名！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# POSTGRES_PASSWORD
if [ -z "${POSTGRES_PASSWORD:-}" ] || [[ "$POSTGRES_PASSWORD" =~ ^change-me ]]; then
    log_error "POSTGRES_PASSWORD 未设置或仍为默认值，请在 .env.production 中修改！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# MONGO_PASSWORD
if [ -z "${MONGO_PASSWORD:-}" ] || [[ "$MONGO_PASSWORD" =~ ^change-me ]]; then
    log_error "MONGO_PASSWORD 未设置或仍为默认值，请在 .env.production 中修改！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# REDIS_PASSWORD
if [ -z "${REDIS_PASSWORD:-}" ] || [[ "$REDIS_PASSWORD" =~ ^change-me ]]; then
    log_error "REDIS_PASSWORD 未设置或仍为默认值，请在 .env.production 中修改！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# MEILISEARCH_KEY
if [ -z "${MEILISEARCH_KEY:-}" ] || [[ "$MEILISEARCH_KEY" =~ ^change-me ]]; then
    log_error "MEILISEARCH_KEY 未设置或仍为默认值，请在 .env.production 中修改！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# MINIO credentials
if [ -z "${MINIO_ACCESS_KEY:-}" ] || [[ "$MINIO_ACCESS_KEY" =~ ^change-me ]]; then
    log_error "MINIO_ACCESS_KEY 未设置或仍为默认值，请在 .env.production 中修改！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

if [ -z "${MINIO_SECRET_KEY:-}" ] || [[ "$MINIO_SECRET_KEY" =~ ^change-me ]]; then
    log_error "MINIO_SECRET_KEY 未设置或仍为默认值，请在 .env.production 中修改！"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

if [ $VALIDATION_ERRORS -gt 0 ]; then
    echo ""
    log_error "共发现 ${VALIDATION_ERRORS} 个配置问题，请修改 .env.production 后重试。"
    log_info "文件路径: $ENV_FILE"
    exit 1
fi

log_info "环境变量验证通过 ✓"

# ---- 3. 检查 Docker 环境 ----
log_info "检查 Docker 环境 ..."

if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装，请先安装 Docker。"
    log_info "安装指南: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    log_error "Docker Compose 未安装或不支持 'docker compose' 命令。"
    log_info "请安装 Docker Compose v2+"
    exit 1
fi

log_info "Docker: $(docker --version)"
log_info "Docker Compose: $(docker compose version)"

# ---- 4. 备份现有数据 ----
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

log_info "备份现有数据 (如果存在) ..."
cd "$PROJECT_DIR"

# PostgreSQL 备份
if docker compose -f "$COMPOSE_FILE" ps postgres 2>/dev/null | grep -q "Up"; then
    docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U "${POSTGRES_USER:-xone}" "${POSTGRES_DB:-xone}" \
        > "$BACKUP_DIR/postgres_predeploy_${BACKUP_TIMESTAMP}.sql" 2>/dev/null && \
        log_info "PostgreSQL 备份: $BACKUP_DIR/postgres_predeploy_${BACKUP_TIMESTAMP}.sql" || \
        log_warn "PostgreSQL 备份失败 (可能数据库为空)"
else
    log_info "PostgreSQL 未运行，跳过备份"
fi

# MongoDB 备份
if docker compose -f "$COMPOSE_FILE" ps mongodb 2>/dev/null | grep -q "Up"; then
    docker compose -f "$COMPOSE_FILE" exec -T mongodb mongodump --archive \
        > "$BACKUP_DIR/mongo_predeploy_${BACKUP_TIMESTAMP}.archive" 2>/dev/null && \
        log_info "MongoDB 备份: $BACKUP_DIR/mongo_predeploy_${BACKUP_TIMESTAMP}.archive" || \
        log_warn "MongoDB 备份失败"
else
    log_info "MongoDB 未运行，跳过备份"
fi

# ---- 5. SSL 证书检查 ----
mkdir -p "$DOCKER_DIR/ssl" "$DOCKER_DIR/certbot/www"

log_info "检查 SSL 证书 ..."
SSL_READY=false

if [ -f "$DOCKER_DIR/ssl/fullchain.pem" ] && [ -f "$DOCKER_DIR/ssl/privkey.pem" ]; then
    # 验证证书是否匹配当前域名
    CERT_DOMAIN=$(openssl x509 -in "$DOCKER_DIR/ssl/fullchain.pem" -noout -subject 2>/dev/null | sed -n 's/.*CN *= *\([^ /]*\).*/\1/p' || echo "")
    if [ -n "$CERT_DOMAIN" ] && { [ "$CERT_DOMAIN" = "$DOMAIN" ] || [[ "$CERT_DOMAIN" == *."$DOMAIN" ]]; }; then
        # 检查证书是否过期 (30 天内过期则警告)
        if openssl x509 -in "$DOCKER_DIR/ssl/fullchain.pem" -noout -checkend 2592000 2>/dev/null; then
            log_info "SSL 证书有效 (域名: ${CERT_DOMAIN})"
            SSL_READY=true
        else
            log_warn "SSL 证书将在 30 天内过期，建议使用 --ssl 重新申请"
        fi
    else
        log_warn "SSL 证书域名 (${CERT_DOMAIN:-未知}) 与配置的 DOMAIN (${DOMAIN}) 不匹配"
    fi
fi

if ! $SSL_READY; then
    if $SSL_FLAG; then
        log_info "尝试申请 Let's Encrypt SSL 证书 ..."
        if [ -f "$SCRIPT_DIR/setup-ssl.sh" ]; then
            bash "$SCRIPT_DIR/setup-ssl.sh"
            if [ -f "$DOCKER_DIR/ssl/fullchain.pem" ] && [ -f "$DOCKER_DIR/ssl/privkey.pem" ]; then
                SSL_READY=true
                log_info "SSL 证书申请成功"
            else
                log_warn "SSL 证书申请可能失败，将仅启用 HTTP"
            fi
        else
            log_warn "setup-ssl.sh 不存在，跳过 SSL 证书申请"
        fi
    else
        log_warn "未找到有效的 SSL 证书，将仅启用 HTTP (使用 --ssl 自动申请 Let's Encrypt 证书)"
    fi
fi

# ---- 6. 准备 Nginx 配置 ----
log_info "准备 Nginx 配置 ..."

# 复制 nginx.conf 并替换 DOMAIN 变量
NGINX_CONF_SRC="$DOCKER_DIR/nginx.conf"
NGINX_CONF_FINAL="$DOCKER_DIR/nginx.conf"

# 检查 nginx.conf 是否包含 ${DOMAIN} 变量引用
if grep -q '\${DOMAIN}' "$NGINX_CONF_SRC" 2>/dev/null; then
    log_info "Nginx 配置中包含 \${DOMAIN} 变量，将在部署时由 Nginx 自行解析"
fi

# ---- 7. 构建镜像 ----
log_step "构建 Docker 镜像 (--no-cache)"
cd "$PROJECT_DIR"
docker compose -f "$COMPOSE_FILE" build --no-cache 2>&1 | while IFS= read -r line; do
    echo "  $line"
done

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_error "镜像构建失败！请检查上方错误信息。"
    exit 1
fi
log_info "镜像构建完成"

# ---- 8. 启动服务 ----
log_step "启动生产服务"
docker compose -f "$COMPOSE_FILE" up -d 2>&1

# ---- 9. 健康检查等待 ----
log_step "等待服务健康检查通过..."
MAX_WAIT=120
WAIT_INTERVAL=5
ELAPSED=0

# 关键服务列表
CRITICAL_SERVICES=("postgres" "redis" "mongodb" "backend" "frontend" "nginx")

while [ $ELAPSED -lt $MAX_WAIT ]; do
    ALL_HEALTHY=true
    
    for svc in "${CRITICAL_SERVICES[@]}"; do
        STATUS=$(docker compose -f "$COMPOSE_FILE" ps --format json "$svc" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('Health','unknown'))" 2>/dev/null || echo "unknown")
        if [ "$STATUS" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} $svc: $STATUS"
        elif [ "$STATUS" = "starting" ]; then
            echo -e "  ${YELLOW}⏳${NC} $svc: $STATUS"
            ALL_HEALTHY=false
        else
            echo -e "  ${YELLOW}?${NC} $svc: $STATUS"
        fi
    done
    
    if $ALL_HEALTHY; then
        log_info "所有关键服务健康检查通过！"
        break
    fi
    
    sleep $WAIT_INTERVAL
    ELAPSED=$((ELAPSED + WAIT_INTERVAL))
    echo "  等待中... (${ELAPSED}s / ${MAX_WAIT}s)"
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    log_warn "部分服务可能未完全就绪，请手动检查:"
    docker compose -f "$COMPOSE_FILE" ps
fi

# ---- 10. 部署结果 ----
log_step "部署完成！"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              XOne 生产环境部署成功！                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# 服务状态
echo -e "${BLUE}服务状态:${NC}"
cd "$PROJECT_DIR"
docker compose -f "$COMPOSE_FILE" ps

echo ""
echo -e "${BLUE}访问地址:${NC}"
if $SSL_READY; then
    echo "  https://${DOMAIN}"
elif [ -n "${DOMAIN:-}" ] && [ "$DOMAIN" != "example.com" ]; then
    echo "  http://${DOMAIN}  (SSL 未配置，使用 --ssl 申请证书)"
else
    echo "  http://localhost  (请配置 DOMAIN 并申请 SSL 证书)"
fi

echo ""
echo -e "${BLUE}SSL 证书状态:${NC}"
if $SSL_READY; then
    EXPIRY=$(openssl x509 -in "$DOCKER_DIR/ssl/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2 || echo "未知")
    echo -e "  ${GREEN}✓ 已配置${NC}  (过期时间: ${EXPIRY})"
elif [ -f "$DOCKER_DIR/ssl/fullchain.pem" ]; then
    echo -e "  ${YELLOW}⚠ 证书存在但未通过验证，请检查${NC}"
else
    echo -e "  ${YELLOW}⚠ 未配置${NC}  (运行: bash scripts/deploy.sh --ssl)"
fi

echo ""
echo -e "${BLUE}常用命令:${NC}"
echo "  查看日志:   bash scripts/deploy.sh --logs"
echo "  重启服务:   bash scripts/deploy.sh --restart"
echo "  备份数据:   bash scripts/deploy.sh --backup"
echo "  申请 SSL:   bash scripts/deploy.sh --ssl"
echo "  停止服务:   docker compose -f $COMPOSE_FILE down"
echo ""
