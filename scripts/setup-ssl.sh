#!/usr/bin/env bash
# =============================================================================
# XOne — SSL 证书自动申请脚本 (Let's Encrypt + certbot)
# =============================================================================
# 用法:
#   1. 确保 .env.production 中 DOMAIN 已正确配置
#   2. 确保域名 DNS 已解析到当前服务器 IP
#   3. bash scripts/setup-ssl.sh
# =============================================================================
set -euo pipefail

# ---- 颜色输出 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step()  { echo -e "\n${BLUE}============================================================${NC}"; echo -e "${BLUE}▶ $*${NC}"; echo -e "${BLUE}============================================================${NC}"; }

# ---- 路径配置 ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_DIR="$PROJECT_DIR/docker"
ENV_FILE="$PROJECT_DIR/.env.production"
COMPOSE_FILE="docker/docker-compose.prod.yml"
CERTBOT_WWW="$DOCKER_DIR/certbot/www"
SSL_DIR="$DOCKER_DIR/ssl"
RENEWAL_HOOK="$SCRIPT_DIR/certbot-renewal-hook.sh"

# ---- 加载环境变量 ----
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE" 2>/dev/null || true
    set +a
else
    log_error ".env.production 不存在，请先运行 deploy.sh 初始化配置"
    exit 1
fi

# ---- 验证 DOMAIN ----
if [ -z "${DOMAIN:-}" ] || [ "$DOMAIN" = "example.com" ]; then
    log_error "请在 .env.production 中设置正确的 DOMAIN 变量"
    log_info "示例: DOMAIN=myapp.example.com"
    exit 1
fi

# ---- 验证必要工具 ----
for cmd in docker certbot openssl; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd 未安装，请先安装。"
        exit 1
    fi
done

log_step "为域名 ${DOMAIN} 申请 Let's Encrypt SSL 证书"

# ---- 1. 检查 DNS 解析 ----
log_info "检查域名 DNS 解析 ..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "unknown")
DOMAIN_IP=$(dig +short "$DOMAIN" 2>/dev/null || host "$DOMAIN" 2>/dev/null | awk '/has address/ {print $NF}' || echo "unknown")

log_info "服务器公网 IP: $SERVER_IP"
log_info "域名解析 IP:   $DOMAIN_IP"

if [ "$SERVER_IP" != "unknown" ] && [ "$DOMAIN_IP" != "unknown" ] && [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    log_warn "域名 ${DOMAIN} 解析到 ${DOMAIN_IP}，但服务器 IP 是 ${SERVER_IP}"
    log_warn "请确保域名正确解析到本服务器，否则证书申请将失败。"
    read -r -p "是否继续? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "已取消"
        exit 0
    fi
fi

# ---- 2. 创建必要目录 ----
mkdir -p "$CERTBOT_WWW" "$SSL_DIR"

# ---- 3. 确保 Nginx 运行在 HTTP 模式 (用于域名验证) ----
log_info "检查 Nginx 服务状态 ..."
cd "$PROJECT_DIR"

if ! docker compose -f "$COMPOSE_FILE" ps nginx 2>/dev/null | grep -q "Up"; then
    log_warn "Nginx 未运行，正在启动..."
    docker compose -f "$COMPOSE_FILE" up -d nginx
    sleep 5
fi

# ---- 4. 临时 HTTP-only 验证配置 ----
log_info "创建临时 HTTP 验证配置 ..."

# 确保 Nginx 80 端口可访问
if ! curl -s -o /dev/null -w "%{http_code}" "http://localhost/.well-known/acme-challenge/test" 2>/dev/null | grep -q "200\|404"; then
    log_warn "无法访问本地 HTTP 服务，检查 Nginx 80 端口映射..."
    docker compose -f "$COMPOSE_FILE" port nginx 80 2>/dev/null || true
fi

# ---- 5. 使用 certbot 获取证书 ----
log_step "运行 certbot 获取 SSL 证书"
log_info "这可能需要几分钟，请耐心等待..."

# 使用 standalone 模式或 webroot 模式
# webroot 模式：certbot 在 CERTBOT_WWW 目录下放置验证文件，Nginx 负责提供
CERTBOT_SUCCESS=false

if certbot certonly \
    --webroot \
    --webroot-path="$CERTBOT_WWW" \
    --non-interactive \
    --agree-tos \
    --email "${SMTP_USER:-admin@${DOMAIN}}" \
    --domains "$DOMAIN" \
    --keep-until-expiring \
    --expand 2>&1; then
    CERTBOT_SUCCESS=true
else
    log_warn "webroot 模式失败，尝试 standalone 模式..."
    
    # Standalone 模式：certbot 临时启动自己的 HTTP 服务器
    # 需要先停止 Nginx 释放 80 端口
    docker compose -f "$COMPOSE_FILE" stop nginx 2>/dev/null || true
    
    if certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "${SMTP_USER:-admin@${DOMAIN}}" \
        --domains "$DOMAIN" \
        --keep-until-expiring \
        --expand 2>&1; then
        CERTBOT_SUCCESS=true
    else
        log_warn "standalone 模式也失败，尝试手动 DNS 验证模式..."
        log_info "请按照 certbot 提示手动完成验证:"
        certbot certonly --manual --agree-tos --domains "$DOMAIN"
    fi
    
    # 重新启动 Nginx
    docker compose -f "$COMPOSE_FILE" start nginx 2>/dev/null || true
fi

if ! $CERTBOT_SUCCESS; then
    log_error "SSL 证书申请失败！"
    log_info "常见原因:"
    log_info "  1. 域名 DNS 未正确解析到本服务器"
    log_info "  2. 防火墙未开放 80/443 端口"
    log_info "  3. certbot 频率限制 (每 7 天最多 5 个证书/域名)"
    log_info ""
    log_info "手动调试: certbot certonly --webroot -w $CERTBOT_WWW -d $DOMAIN"
    exit 1
fi

# ---- 6. 复制证书到 Nginx SSL 目录 ----
log_step "部署 SSL 证书"

CERT_SOURCE="/etc/letsencrypt/live/${DOMAIN}"
if [ -d "$CERT_SOURCE" ]; then
    cp "$CERT_SOURCE/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$CERT_SOURCE/privkey.pem"   "$SSL_DIR/privkey.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    log_info "证书已复制到 $SSL_DIR/"
else
    log_error "证书目录不存在: $CERT_SOURCE"
    exit 1
fi

# ---- 7. 重新加载 Nginx 以启用 HTTPS ----
log_info "重新加载 Nginx 配置 ..."
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload 2>/dev/null || \
    docker compose -f "$COMPOSE_FILE" restart nginx

# ---- 8. 验证 HTTPS ----
log_info "验证 HTTPS 访问 ..."
sleep 3
if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" 2>/dev/null | grep -q "200\|301\|302"; then
    log_info "HTTPS 验证成功！ https://${DOMAIN}"
else
    log_warn "HTTPS 验证可能失败，请手动检查配置"
fi

# ---- 9. 设置自动续期 ----
log_step "配置证书自动续期"

# 创建续期后钩子脚本
cat > "$RENEWAL_HOOK" << 'HOOK_EOF'
#!/usr/bin/env bash
# certbot 续期后自动复制证书并重载 Nginx
set -euo pipefail

DOMAIN="${1:-}"
SSL_DIR="/Users/hesse/AI Coding/Hermes/Project/XOne/docker/ssl"
PROJECT_DIR="/Users/hesse/AI Coding/Hermes/Project/XOne"
COMPOSE_FILE="docker/docker-compose.prod.yml"

if [ -z "$DOMAIN" ]; then
    echo "用法: $0 <domain>"
    exit 1
fi

CERT_SOURCE="/etc/letsencrypt/live/${DOMAIN}"
if [ -d "$CERT_SOURCE" ]; then
    cp "$CERT_SOURCE/fullchain.pem" "$SSL_DIR/fullchain.pem"
    cp "$CERT_SOURCE/privkey.pem"   "$SSL_DIR/privkey.pem"
    chmod 600 "$SSL_DIR/privkey.pem"
    
    cd "$PROJECT_DIR"
    docker compose -f "$COMPOSE_FILE" exec -T nginx nginx -s reload && \
        echo "[$(date)] 证书续期成功: $DOMAIN" || \
        echo "[$(date)] 证书续期成功但 Nginx 重载失败: $DOMAIN"
else
    echo "[$(date)] 证书目录不存在: $CERT_SOURCE"
    exit 1
fi
HOOK_EOF

chmod +x "$RENEWAL_HOOK"

# 添加 cron 任务 (每天凌晨 2 点检查续期)
CRON_JOB="0 2 * * * certbot renew --quiet --deploy-hook \"$RENEWAL_HOOK $DOMAIN\""

# 检查是否已存在相同的 cron 任务
if crontab -l 2>/dev/null | grep -qF "certbot renew"; then
    log_info "certbot 自动续期 cron 已存在，跳过添加"
else
    (crontab -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -
    log_info "已添加 certbot 自动续期 cron 任务 (每日凌晨 2:00)"
fi

# ---- 完成 ----
log_step "SSL 证书配置完成！"
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              SSL 证书部署成功！                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}访问地址:${NC}  https://${DOMAIN}"
echo -e "${BLUE}证书路径:${NC}  $SSL_DIR/"
echo -e "${BLUE}续期钩子:${NC}  $RENEWAL_HOOK"
echo -e "${BLUE}手动续期:${NC}  certbot renew --force-renewal"
echo ""
echo -e "${YELLOW}注意: Let's Encrypt 证书有效期为 90 天，已配置自动续期。${NC}"
echo -e "${YELLOW}请确保 80 端口持续可访问以完成续期验证。${NC}"
echo ""
