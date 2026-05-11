# XOne — GitHub Actions Secrets & Variables 配置

> 最后更新: 2026-05-12 (v4a)

---

## Secrets (在 Settings → Secrets and variables → Actions)

| Secret | 说明 | 示例 | 必需 |
|--------|------|------|------|
| `DEPLOY_HOST` | 生产服务器 IP/域名 | `192.168.1.100` | ✅ |
| `DEPLOY_USER` | SSH 登录用户 | `deploy` | ✅ |
| `DEPLOY_KEY` | SSH 私钥 (ed25519 推荐) | `-----BEGIN OPENSSH PRIVATE KEY-----` | ✅ |
| `SERVER_ENV` | 生产 .env 完整内容 | 见下方模板 | ✅ |
| `GITHUB_TOKEN` | 自动注入，无需手动配置 | — | 自动 |

---

## Variables (在 Settings → Secrets and variables → Actions)

| Variable | 说明 | 示例 |
|----------|------|------|
| `DOMAIN` | 生产域名 | `xone.example.com` |

---

## 配置步骤

### 1. 生成 SSH 密钥对

```bash
# 在本地生成 (不需要密码)
ssh-keygen -t ed25519 -C "xone-deploy" -f ~/.ssh/xone-deploy

# 将公钥添加到服务器的 ~/.ssh/authorized_keys
ssh-copy-id -i ~/.ssh/xone-deploy.pub deploy@YOUR_SERVER_IP

# 私钥内容 (粘贴到 GitHub Secrets → DEPLOY_KEY)
cat ~/.ssh/xone-deploy
```

### 2. 服务器初始化

```bash
# SSH 到服务器
ssh deploy@YOUR_SERVER_IP

# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 创建目录
mkdir -p /opt/xone/{docker,scripts,certbot/{conf,www}}
```

### 3. 配置 SERVER_ENV

将以下内容设为 `SERVER_ENV` secret（替换占位符后）：

```env
# ---- 域名 ----
DOMAIN=xone.example.com

# ---- 运行模式 ----
MODE=production

# ---- Uvicorn Worker 数量 ----
WEB_CONCURRENCY=4

# ---- 应用密钥 ----
SECRET_KEY=<openssl rand -hex 32>

# ---- JWT 配置 ----
JWT_SECRET_KEY=<openssl rand -hex 32>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# ---- PostgreSQL ----
POSTGRES_USER=xone
POSTGRES_PASSWORD=<strong_password>
POSTGRES_DB=xone
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# ---- MongoDB ----
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=<strong_password>
MONGO_HOST=mongodb
MONGO_PORT=27017

# ---- Redis ----
REDIS_HOST=redis
REDIS_PORT=6379

# ---- Qdrant ----
QDRANT_HOST=qdrant
QDRANT_PORT=6333
QDRANT_API_KEY=<generate>

# ---- 日志级别 ----
LOG_LEVEL=INFO

# ---- Certbot ----
CERTBOT_EMAIL=admin@example.com
```

### 4. 验证 CI/CD

```bash
# 手动触发部署
gh workflow run deploy.yml --ref main -f environment=production

# 查看状态
gh run list --workflow=deploy.yml
```

---

## 部署流程

```
git push main
  │
  ├─→ CI Pipeline (ci.yml)
  │     ├─ Backend Lint + Test
  │     ├─ Frontend Build + E2E
  │     └─ Docker Build + Push to GHCR
  │
  └─→ Deploy Pipeline (deploy.yml)  ← CI 成功后自动触发
        ├─ SSH 复制 compose + nginx + .env
        ├─ docker compose pull (拉取 GHCR 镜像)
        ├─ docker compose up -d (启动/更新服务)
        └─ Health Check (HTTPS + API)
```

---

## 回滚

```bash
# SSH 到服务器
ssh deploy@YOUR_SERVER_IP

# 查看历史镜像
docker images ghcr.io/hermann0703/xone*

# 回滚到指定版本
cd /opt/xone
IMAGE_TAG=<commit-hash>
BACKEND_IMAGE=ghcr.io/hermann0703/xone-backend:${IMAGE_TAG}
FRONTEND_IMAGE=ghcr.io/hermann0703/xone-frontend:${IMAGE_TAG}

docker compose -f docker/docker-compose.prod.yml up -d
```
