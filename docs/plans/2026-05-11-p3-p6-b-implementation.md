# P3 + P6 + B 实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan.
> **Date:** 2026-05-11
> **Status:** 待用户确认

---

## 总体架构

本轮推进 3 个模块：P3 双仪表盘数据化（核心）→ P6 迁移补全 → B 运维基建

分 3 阶段串行推进，每阶段独立提交。

---

## 阶段 1: P3 — 双仪表盘数据化

### 问题诊断

两个仪表盘（WorkDashboard 466 行、PersonalDashboard 399 行）均使用硬编码占位数据，
`grep -c '占位\|硬编码'` 各命中 1 次（注释行），但实际所有数据都是静态常量。

各子模块已有 dashboard 端点（如 `/api/v1/personal/health/dashboard`），
但聚合仪表盘需要跨模块数据，现有端点无法满足。

### 架构方案

- **后端**：新建 2 个聚合 API 端点，每个 endpoint 聚合对应域下所有子模块的统计数据
- **前端**：替换硬编码数据为 API 调用，添加 loading/error 状态处理

### Task 1.1: 工作仪表盘聚合 API

**创建文件:** `backend/app/api/work/dashboard.py`

**端点:** `GET /api/v1/work/dashboard`

**聚合数据来源（跨服务调用）:**

| 数据项 | 来源 | 说明 |
|--------|------|------|
| `project_count` / `active_projects` | project_service.list_projects() | 项目总数 + 进行中数 |
| `pending_tasks` | project_service.list_tasks_by_project() | 总待办任务数 |
| `contract_count` / `expiring_contracts` | contract_service | 合同总数 + 30天内到期数 |
| `archive_count` / `pending_borrows` | archive_service | 档案总数 + 待处理借阅 |
| `dispatch_count` / `pending_dispatch` | dispatch_service | 报送总数 + 待报送 |
| `project_progress` | project_service | Top 5 项目进度（name, progress, deadline, status） |
| `recent_activities` | 聚合各模块最近操作 | 最近 10 条活动（action, target, time, user） |

**响应格式 (设计稿):**
```json
{
  "code": 0,
  "data": {
    "stats": {
      "active_projects": 3,
      "pending_tasks": 12,
      "expiring_contracts": 2,
      "pending_borrows": 1,
      "pending_dispatch": 0
    },
    "project_progress": [
      {"id": "...", "name": "XOne v2.0", "progress": 72, "deadline": "2026-06-15", "status": "active"}
    ],
    "recent_activities": [
      {"id": "...", "action": "更新任务", "target": "登录页面重构", "time": "10:30", "user": "张伟"}
    ]
  }
}
```

**设计决策:**
- `project_progress.progress` 通过 `completed_tasks / total_tasks` 计算
- `recent_activities` 聚合 project_tasks 的 updated_at + contracts 的 updated_at +
  archives borrows 的 created_at，按时间降序取 top 10
- 每个无数据模块返回 0 而非报错（优雅降级）
- 需要从 `project_tasks` 表按 `user_id` 过滤聚合"待办任务数"（assignee 匹配当前用户）

### Task 1.2: 个人仪表盘聚合 API

**创建文件:** `backend/app/api/personal/dashboard.py`

**端点:** `GET /api/v1/personal/dashboard`

**聚合数据来源:**

| 数据项 | 来源 | 说明 |
|--------|------|------|
| `shopping_pending` | shopping_service | 待购商品数 |
| `reading_count` | reading_service | 藏书总数 |
| `media_count` | media_service | 观影总数 |
| `health_score` | health_service.get_dashboard() | 健康综合分 |
| `assets_balance` | asset_service.get_dashboard() | 资产总净值 |
| `reading_progress` | reading_service | 最近在读（title, progress, last_read） |
| `recent_activities` | 聚合各模块最近操作 | 最近 10 条活动 |

**响应格式 (设计稿):**
```json
{
  "code": 0,
  "data": {
    "stats": {
      "shopping_pending": 12,
      "reading_total": 45,
      "media_total": 23,
      "health_today_calories": 0,
      "assets_net_worth": 0
    },
    "recent_reading": [
      {"id": "...", "title": "深入理解计算机系统", "progress": 0.65, "last_read": "2026-05-10"}
    ],
    "recent_activities": [
      {"id": "...", "action": "添加书籍", "target": "设计模式", "time": "昨天 14:30"}
    ]
  }
}
```

### Task 1.3: 注册路由

**修改文件:** `backend/app/api/router.py`

添加两个路由注册：
```python
from app.api.work.dashboard import router as work_dashboard_router
from app.api.personal.dashboard import router as personal_dashboard_router

api_router.include_router(work_dashboard_router, prefix="/work", tags=["工作-仪表盘"])
api_router.include_router(personal_dashboard_router, prefix="/personal", tags=["个人-仪表盘"])
```

### Task 1.4: 工作仪表盘前端改造

**修改文件:** `frontend/src/plugins/work/dashboard/WorkDashboard.tsx`

- 添加 `useEffect` + `fetch` 调用 `/api/v1/work/dashboard`
- 添加 `loading` / `error` 状态
- 用 API 返回的 `stats` 替换 5 个 StatCard 硬编码值
- 用 API 返回的 `project_progress` 替换 `projects` 硬编码数组
- 用 API 返回的 `recent_activities` 替换 `recentActivities` 硬编码数组
- 环形图 `ringChartData` 从 `project_progress` 计算（active/completed/archived 比例）
- 日历 `deadlineDays` 从 `project_progress` 的 deadline 字段计算
- 保留现有 UI 结构和组件，仅替换数据源

### Task 1.5: 个人仪表盘前端改造

**修改文件:** `frontend/src/plugins/personal/dashboard/PersonalDashboard.tsx`

- 添加 `useEffect` + `fetch` 调用 `/api/v1/personal/dashboard`
- 添加 `loading` / `error` 状态
- 用 API 返回的 `stats` 替换 5 个 StatCard 硬编码值
- 用 API 返回的 `recent_activities` 替换 `recentActivities` 硬编码数组
- `quickEntries` 保持不变（静态导航链接）
- 环形图从 `stats` 数据计算

### Task 1.6: 后端验证

```bash
# 验证新端点可导入
cd backend && python -c "from app.api.work.dashboard import router; print('work dashboard OK:', len(router.routes))"
cd backend && python -c "from app.api.personal.dashboard import router; print('personal dashboard OK:', len(router.routes))"

# 启动后端
uvicorn app.main:app --port 8000 &

# 测试端点
curl -s http://localhost:8000/api/v1/work/dashboard -H "Authorization: Bearer $TOKEN"
curl -s http://localhost:8000/api/v1/personal/dashboard -H "Authorization: Bearer $TOKEN"
```

### Task 1.7: 前端构建验证 + 浏览器验证

```bash
cd frontend && npx next build 2>&1 | tail -20
# 预期：构建成功，无类型错误

# 启动 dev server
npx next dev -p 3456 &
# 浏览器验证：
#  - /zh/work/dashboard — 无 hydration 错误，数据从 API 加载
#  - /zh/personal/dashboard — 同上
```

---

## 阶段 2: P6 — 数据库迁移验证

### 问题诊断

当前仅 1 个 alembic migration（`5f55b2b699e1_add_project_tables.py`），
但项目有 13 个 model 文件。其他表可能通过 `create_all()` 或早期手动 SQL 创建。

### Task 2.1: 生成当前状态迁移

```bash
cd backend
source .venv/bin/activate
alembic revision --autogenerate -m "sync_all_models"
# 检查生成的迁移文件，确认所有表都在迁移链中
alembic upgrade head
```

### Task 2.2: 验证全部表存在

```bash
# 连接数据库列出所有表
docker exec xone-postgres psql -U xone -d xone -c "\dt"
# 预期：users, projects, project_columns, project_tasks, project_milestones,
#        contracts, archives, knowledge_*, ... 所有模型对应的表
```

---

## 阶段 3: B — 运维基建

### Task 3.1: 数据库备份 cron

**创建文件:** `scripts/backup-db.sh`

- 使用 `pg_dump` 导出 PostgreSQL
- 文件名含时间戳：`xone_backup_$(date +%Y%m%d_%H%M%S).sql.gz`
- 保留最近 7 天备份，自动清理旧文件
- 可选：上传到 S3/OSS（预留接口）

**创建文件:** `scripts/restore-db.sh`

- 从指定备份文件恢复数据库
- 含确认提示（防止误操作）

### Task 3.2: 健康监控端点

**修改文件:** `backend/app/api/health.py`（新增或增强已有）

- `GET /api/v1/health` — 已有，返回 `{"status":"ok","database":true}`
- 增强：添加 `redis`, `mongodb`, `qdrant`, `meilisearch` 连通性检查
- 返回格式统一为 `{"status":"ok|degraded|down", "checks": {...}}`

### Task 3.3: Docker Compose 监控栈（可选，按需创建）

**创建文件:** `docker/docker-compose.monitoring.yml`

- Prometheus + Grafana（预配置仪表盘模板）
- 后端暴露 `/metrics` endpoint（FastAPI + prometheus_fastapi_instrumentator）
- Node Exporter（宿主机资源）

> **决策点：** Task 3.3 较重量，建议先完成 3.1 + 3.2，3.3 由用户决定是否需要

---

## 实施策略

采用 **subagent-driven-development**，2 阶段审查（spec compliance → code quality）

### 阶段 1 并行度

| Batch | 任务 | 类型 | 说明 |
|-------|------|------|------|
| 1 | Task 1.1 + 1.2 | 后端+后端 并行 | 两个 dashboard API，文件独立无冲突 |
| 2 | Task 1.3 | 后端 | 路由注册（共享 router.py，不能并行） |
| 3 | Task 1.4 + 1.5 | 前端+前端 并行 | 两个 dashboard 前端，文件独立 |
| 4 | Task 1.6 + 1.7 | 验证 | 后端导入 + 前端构建 |

### 阶段 2

| Batch | 任务 | 类型 |
|-------|------|------|
| 1 | Task 2.1 + 2.2 | 后端（顺序执行） |

### 阶段 3

| Batch | 任务 | 类型 |
|-------|------|------|
| 1 | Task 3.1 + 3.2 | 脚本+后端（文件独立，并行） |
| 2 | Task 3.3 | 可选，待用户确认 |

---

## 风险与注意事项

| 风险 | 缓解 |
|------|------|
| 跨服务聚合导致 N+1 查询 | 每个 dashboard service 方法用 async/await 并发执行各子服务查询 |
| 某些子服务可能未初始化（无数据） | 所有聚合使用 `try/except` 优雅降级，返回 0/null |
| 前端骨架屏与真实数据不匹配 | Task 1.4/1.5 保留现有 Skeleton 组件，只在数据加载完后切换 |
| router.py 共享文件冲突 | Task 1.3 单独执行，不与其他任务并行 |
| 后端未运行时前端 API 404 | 验证步骤包含后端启动 + curl 测试 |

---

## 提交计划

```
d9-1: feat(work): 工作仪表盘聚合 API — /api/v1/work/dashboard
d9-2: feat(personal): 个人仪表盘聚合 API — /api/v1/personal/dashboard
d9-3: feat(dashboard): 前端双仪表盘接入真实 API
d10: db: 补全数据库迁移 + 验证
d11: ops: 数据库备份 + 健康检查增强
```

---

## 前置条件

- [x] 后端 .venv 可用（Python 3.12）
- [x] 前端 dev server 端口 3456
- [ ] 后端 uvicorn 端口 8000（需启动）
- [ ] 有效的 auth token（用于 curl 测试）
