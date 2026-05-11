#!/usr/bin/env bash
# =============================================================================
# XOne — Let's Encrypt SSL 证书申请脚本 (Certbot)
# =============================================================================
# 前提:
#   1. DOMAIN 已在 .env.production 中配置
#   2. DNS 已指向本服务器的 80/443 端口
#   3. 本脚本由 deploy.sh --ssl 自动调用，也可独立运行
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"
SSL_DIR="$PROJECT_DIR/docker/ssl"
CERTBOT_WWW="$PROJECT_DIR/docker/certbot/www"

# ---- 加载环境变量 ----
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: .env.production 不存在，请先运行 deploy.sh 创建"
    exit 1
fi

set -a
source "$ENV_FILE" 2>/dev/null || true
set +a

if [ -z "${DOMAIN:-}" ] || [ "$DOMAIN" = "example.com" ]; then
    echo "ERROR: DOMAIN 未设置或仍为 example.com，请在 .env.production 中设置真实域名"
    exit 1
fi

echo "============================================"
echo "  XOne — Let's Encrypt SSL 证书申请"
echo "  域名: ${DOMAIN}"
echo "============================================"

# ---- 创建证书目录 ----
mkdir -p "$SSL_DIR" "$CERTBOT_WWW"

# ---- 检查 certbot 是否已安装 ----
if ! command -v certbot &> /dev/null; then
    echo "安装 certbot ..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y certbot
    elif command -v brew &> /dev/null; then
        brew install certbot
    else
        echo "ERROR: 无法自动安装 certbot，请手动安装: https://certbot.eff.org/"
        exit 1
    fi
fi

# ---- 方案 1: 使用 Docker certbot (推荐，无需占用 80 端口) ----
CERTBOT_IMAGE="certbot/certbot:latest"

echo ""
echo "使用 Docker certbot 申请证书 ..."
echo "注意: 请确保 80 端口可被外部访问 (Let's Encrypt HTTP-01 验证需要)"
echo ""

# 先临时停止 nginx 释放 80 端口 (如有运行)
cd "$PROJECT_DIR"
docker compose -f docker/docker-compose.prod.yml stop nginx 2>/dev/null || true

# 使用 standalone 模式申请证书
echo "申请证书: ${DOMAIN} ..."
docker run --rm \
    -v "${SSL_DIR}:/etc/letsencrypt/live/${DOMAIN}" \
    -v "${CERTBOT_WWW}:/var/www/certbot" \
    -p 80:80 \
    "${CERTBOT_IMAGE}" \
    certonly --standalone \
        --non-interactive \
        --agree-tos \
        --email "${CERTBOT_EMAIL:-admin@${DOMAIN}}" \
        -d "${DOMAIN}" \
        || {
    echo ""
    echo "============================================"
    echo "  SSL 证书申请失败！"
    echo "============================================"
    echo "常见原因:"
    echo "  1. 域名 DNS 未正确指向本服务器 IP"
    echo "  2. 80 端口被防火墙阻止"
    echo "  3. 已达到 Let's Encrypt 速率限制 (每周 5 张证书)"
    echo ""
    echo "重试: bash scripts/setup-ssl.sh"
    exit 1
}

# ---- 检查证书文件是否生成 ----
CERT_DIR="${SSL_DIR}/live/${DOMAIN}"
if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
    # 复制到 nginx 期望的位置
    cp "${CERT_DIR}/fullchain.pem" "${SSL_DIR}/fullchain.pem"
    cp "${CERT_DIR}/privkey.pem" "${SSL_DIR}/privkey.pem"

    echo ""
    echo "============================================"
    echo "  SSL 证书申请成功！"
    echo "============================================"
    echo "  证书文件: ${SSL_DIR}/fullchain.pem"
    echo "  私钥文件: ${SSL_DIR}/privkey.pem"
    echo "  过期时间: $(openssl x509 -in "${SSL_DIR}/fullchain.pem" -noout -enddate 2>/dev/null | cut -d= -f2)"
    echo ""
    echo "  证书将自动续期 (如已配置 cron job)"
    echo ""

    # ---- 配置自动续期 cron job ----
    echo "配置自动续期 cron job ..."
    RENEW_SCRIPT="${SCRIPT_DIR}/setup-ssl.sh"
    (crontab -l 2>/dev/null || true; echo "0 3 * * 0 ${RENEW_SCRIPT} --renew >> ${SCRIPT_DIR}/ssl-renewal.log 2>&1") | crontab - && \
        echo "自动续期 cron job 已配置 (每周日凌晨 3:00)" || \
        echo "WARNING: 无法配置 cron job，请手动设置自动续期"

    # 重启 nginx
    docker compose -f docker/docker-compose.prod.yml up -d nginx 2>/dev/null || echo "WARNING: nginx 未重启，请手动启动"
else
    echo "ERROR: 证书文件未生成，请检查 certbot 输出"
    exit 1
fi
