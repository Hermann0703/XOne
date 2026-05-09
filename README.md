# XOne — Personal/Work Integrated Management Platform

XOne is a full-stack application that unifies personal life management (health, assets, reading, media, shopping) with professional work management (contracts, archives, knowledge base, data dispatch, project management) into a single, cohesive platform.

## Tech Stack

| Layer             | Technology                                          |
| ----------------- | --------------------------------------------------- |
| **Backend**       | FastAPI (Python 3.12+)                              |
| **Frontend**      | Next.js 14 (React, TypeScript)                      |
| **Relational DB** | PostgreSQL 16                                       |
| **Document DB**   | MongoDB 7                                           |
| **Cache / Queue** | Redis 7                                             |
| **Full-text**     | Meilisearch v1.8                                    |
| **Vector DB**     | Qdrant                                              |
| **Object Storage**| MinIO (S3-compatible)                               |
| **Async Tasks**   | Celery + Celery Beat                                |
| **Reverse Proxy** | Nginx                                               |
| **Auth**          | JWT (python-jose + passlib)                         |

## Quick Start

```bash
# 1. Clone & configure
git clone <repo-url> xone && cd xone
cp .env.example .env

# 2. Start infrastructure
docker compose -f docker/docker-compose.yml up -d

# 3. Frontend
cd frontend
npm install
npm run dev                   # → http://localhost:3000

# 4. Backend (in another terminal)
cd backend
python -m uvicorn app.main:app --reload   # → http://localhost:8000
```

API docs: http://localhost:8000/docs

## Feature Modules

### Personal Mode
| Module     | Functions                                     |
| ---------- | ---------------------------------------------- |
| **Health** | Sleep tracking, weight logs, exercise records  |
| **Assets** | Bank accounts, investments, real estate        |
| **Reading**| Book tracking, reading progress, notes         |
| **Media**  | Movie/TV tracking, watchlists, reviews         |
| **Shopping**| Items, categories, wishlists                  |

### Work Mode
| Module         | Functions                                       |
| -------------- | ------------------------------------------------ |
| **Contracts**  | Full contract lifecycle (draft → signed → completed), milestones |
| **Archives**   | Document archival, borrowing, appraisal, security classification |
| **Knowledge**  | Knowledge base with RAG-powered Q&A (Qdrant)     |
| **Dispatch**   | Scheduled data submission to external systems    |
| **Storage**    | File upload/download with MinIO backend          |
| **Search**     | Global full-text search across all modules       |

## Project Structure

```
XOne/
├── backend/
│   ├── app/
│   │   ├── api/           # Route handlers (auth, personal, work)
│   │   ├── core/          # Config, database, security, MongoDB
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── services/      # Business logic layer
│   │   ├── tasks/         # Celery async tasks
│   │   └── main.py        # FastAPI application entry point
│   ├── tests/             # pytest test suite
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── alembic/           # Database migrations
├── frontend/              # Next.js 14 application
├── docker/                # Docker Compose & Dockerfiles
├── scripts/               # Deployment & setup scripts
├── docs/                  # Additional documentation
├── .env.example           # Environment variable template
├── README.md
└── README.zh-CN.md
```

## Running Tests

```bash
cd backend

# Install dev dependencies
pip install -r requirements-dev.txt

# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run with coverage
python -m pytest tests/ -v --cov=app --cov-report=html
```

Tests use in-memory SQLite (aiosqlite) — no external database needed.

### Frontend E2E Tests

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install chromium

# Run all E2E tests (auto-starts dev server)
npm test

# Interactive UI mode
npm run test:ui

# View last test report
npm run test:report
```

Tests use Playwright with Chromium — 19 test cases covering all pages.

## Production Deployment

```bash
# One-click deployment
./scripts/deploy.sh

# Manual steps:
# 1. Prepare environment
cp .env.example .env.production
vim .env.production       # Set all passwords, keys, and domain

# 2. Deploy with production compose
docker compose -f docker/docker-compose.prod.yml up -d

# 3. Verify
curl http://localhost/health
```

## License

MIT
