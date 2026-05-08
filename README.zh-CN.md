# XOne — 个人/工作一体化管理平台

XOne 是一个全栈应用，将个人生活管理（健康、资产、阅读、观影、购物）与专业工作管理（合同、档案、知识库、数据报送、项目管理）融合到统一的平台中。

## 技术栈

| 层级               | 技术                                                |
| ------------------ | --------------------------------------------------- |
| **后端**           | FastAPI (Python 3.12+)                              |
| **前端**           | Next.js 14 (React, TypeScript)                      |
| **关系数据库**     | PostgreSQL 16                                       |
| **文档数据库**     | MongoDB 7                                           |
| **缓存/消息队列**  | Redis 7                                             |
| **全文搜索**       | Meilisearch v1.8                                    |
| **向量数据库**     | Qdrant                                              |
| **对象存储**       | MinIO (兼容 S3)                                     |
| **异步任务**       | Celery + Celery Beat                                |
| **反向代理**       | Nginx                                               |
| **认证**           | JWT (python-jose + passlib)                         |

## 快速开始

```bash
# 1. 克隆并配置
git clone <repo-url> xone && cd xone
cp .env.example .env

# 2. 启动基础设施
docker compose -f docker/docker-compose.yml up -d

# 3. 前端
cd frontend
npm install
npm run dev                   # → http://localhost:3000

# 4. 后端（另开终端）
cd backend
python -m uvicorn app.main:app --reload   # → http://localhost:8000
```

API 文档：http://localhost:8000/docs

## 功能模块

### 个人模式
| 模块       | 功能                                   |
| ---------- | -------------------------------------- |
| **健康**   | 睡眠追踪、体重记录、运动记录           |
| **资产**   | 银行账户、投资、房产管理               |
| **阅读**   | 书籍追踪、阅读进度、笔记               |
| **观影**   | 影视追踪、待看清单、评价               |
| **购物**   | 商品管理、分类、心愿单                 |

### 工作模式
| 模块         | 功能                                             |
| ------------ | ------------------------------------------------ |
| **合同管理** | 全生命周期管理（草稿→签署→完成），里程碑追踪     |
| **档案管理** | 档案归档、借阅、鉴定、密级分类                   |
| **知识库**   | 知识管理，支持 RAG 问答（Qdrant）                |
| **数据报送** | 定时数据报送至外部系统                           |
| **文件存储** | 基于 MinIO 的文件上传下载                         |
| **全局搜索** | 跨模块全文搜索                                   |

## 项目结构

```
XOne/
├── backend/
│   ├── app/
│   │   ├── api/           # 路由处理器（认证、个人、工作）
│   │   ├── core/          # 配置、数据库、安全、MongoDB
│   │   ├── models/        # SQLAlchemy ORM 模型
│   │   ├── services/      # 业务逻辑层
│   │   ├── tasks/         # Celery 异步任务
│   │   └── main.py        # FastAPI 应用入口
│   ├── tests/             # pytest 测试套件
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── alembic/           # 数据库迁移
├── frontend/              # Next.js 14 前端应用
├── docker/                # Docker Compose 编排文件与 Dockerfile
├── scripts/               # 部署与配置脚本
├── docs/                  # 补充文档
├── .env.example           # 环境变量模板
├── README.md              # English README
└── README.zh-CN.md        # 本文件
```

## 运行测试

```bash
cd backend

# 安装开发依赖
pip install -r requirements-dev.txt

# 运行全部测试
python -m pytest tests/ -v

# 运行指定测试文件
python -m pytest tests/test_auth.py -v

# 含覆盖率报告
python -m pytest tests/ -v --cov=app --cov-report=html
```

测试使用内存 SQLite (aiosqlite)，无需外部数据库。

## 生产部署

```bash
# 一键部署
./scripts/deploy.sh

# 手动步骤：
# 1. 配置环境变量
cp .env.example .env.production
vim .env.production       # 请务必修改所有密钥、密码和域名

# 2. 使用生产编排部署
docker compose -f docker/docker-compose.prod.yml up -d

# 3. 验证
curl http://localhost/health
```

## 许可证

MIT
