# XOne 新一轮推进 — 完整实施计划

> **For Hermes:** Use subagent-driven-development skill to implement task-by-task.
> **Date:** 2026-05-09
> **Status:** Phase 1 (P1) in progress

---

## 总体架构

本轮推进 6 个 Gap，按优先级排序：P1(Project API) → P2(购物前端) → P3(仪表盘) → P4(健康补全) → P5(档案馆前端) → P6(Schema)

每个 Gap 独立成一个 Phase，Phase 内用 subagent-driven-development 子任务推进。

---

## Phase 1: 工作-项目管理 后端 API

**目标:** 为已完整实现的前端 KanbanBoard 搭建 PostgreSQL 后端 API（4 张表，16 个端点）

**数据模型:**
- `projects` (id, name, description, status, startDate, endDate, user_id, created_at, updated_at)
- `project_columns` (id, project_id, title, order, created_at)
- `project_tasks` (id, column_id, title, description, assignee, priority, dueDate, startDate, order, tags, created_at, updated_at)
- `project_milestones` (id, project_id, title, description, dueDate, status, progress, created_at, updated_at)

**API 端点设计 (16 个):**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/work/projects | 列表（当前用户） |
| POST | /api/v1/work/projects | 创建项目（含默认 3 列） |
| GET | /api/v1/work/projects/{id} | 获取单个项目 |
| PUT | /api/v1/work/projects/{id} | 更新项目 |
| DELETE | /api/v1/work/projects/{id} | 删除项目（级联） |
| GET | /api/v1/work/projects/{id}/columns | 获取列列表 |
| POST | /api/v1/work/projects/{id}/columns | 创建列 |
| PUT | /api/v1/work/columns/{id} | 更新列 |
| DELETE | /api/v1/work/columns/{id} | 删除列（级联任务） |
| PATCH | /api/v1/work/projects/{id}/columns/reorder | 列重新排序 |
| GET | /api/v1/work/projects/{id}/tasks | 获取所有任务 |
| POST | /api/v1/work/projects/{id}/tasks | 创建任务 |
| PUT | /api/v1/work/tasks/{id} | 更新任务 |
| DELETE | /api/v1/work/tasks/{id} | 删除任务 |
| PATCH | /api/v1/work/tasks/{id}/move | 移动任务（跨列+序位） |
| GET | /api/v1/work/projects/{id}/milestones | 获取里程碑 |
| POST | /api/v1/work/projects/{id}/milestones | 创建里程碑 |
| PUT | /api/v1/work/milestones/{id} | 更新里程碑 |
| DELETE | /api/v1/work/milestones/{id} | 删除里程碑 |

---

## Phase 1 Tasks

### Task 1: 创建 SQLAlchemy 数据模型

**Objective:** 创建 projects、project_columns、project_tasks、project_milestones 四张表的 ORM 模型

**Files:**
- Create: `backend/app/models/project.py`

**内容要点:**
- 继承 `Base` + `TimestampMixin`
- UUID 主键（`SAUUID(as_uuid=True)`）
- `user_id` 外键关联 `users.id`
- `tags` 字段存 JSON 字符串（与 knowledge 模块一致）
- `project_tasks.column_id` 外键关联 `project_columns.id`（级联删除）
- `project_milestones.project_id` 外键关联 `projects.id`（级联删除）

### Task 2: 创建 Pydantic Schema

**Objective:** 定义请求/响应模型

**Files:**
- Create: `backend/app/schemas/project.py`

**内容:**
- `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`
- `ColumnCreate`, `ColumnUpdate`, `ColumnResponse`
- `TaskCreate`, `TaskUpdate`, `TaskResponse`, `TaskMove`
- `MilestoneCreate`, `MilestoneUpdate`, `MilestoneResponse`
- `ReorderRequest`

### Task 3: 创建 Service 层

**Objective:** 实现业务逻辑（CRUD + 排序 + 级联）

**Files:**
- Create: `backend/app/services/project_service.py`

**方法:**
- `list_projects(db, user_id)` — 查询用户所有项目
- `get_project(db, project_id)` — 单个查询
- `create_project(db, data, user_id)` — 事务：创建项目 + 3 个默认列
- `update_project(db, id, data)` — 更新
- `delete_project(db, id)` — 级联删除（ORM cascade 处理）
- `list_columns(db, project_id)` — 按 order 排序
- `create_column(db, project_id, data)` — 创建列（order = max+1）
- `update_column(db, id, data)` — 更新
- `delete_column(db, id)` — 删除列（级联删除任务）
- `reorder_columns(db, project_id, ordered_ids)` — 批量更新 order
- `list_tasks_by_project(db, project_id)` — 获取所有任务（按列 order + 任务 order）
- `create_task(db, data)` — 创建任务（order = max+1）
- `update_task(db, id, data)` — 更新
- `delete_task(db, id)` — 删除
- `move_task(db, task_id, target_column_id, target_order)` — 事务：更新目标列任务 order + 源列任务 order
- `list_milestones(db, project_id)` — 按 dueDate 排序
- `create_milestone(db, data)` — 创建
- `update_milestone(db, id, data)` — 更新
- `delete_milestone(db, id)` — 删除

### Task 4: 创建 API 路由

**Objective:** 暴露 RESTful 端点

**Files:**
- Create: `backend/app/api/work/project.py`

**端点:** 如上表 16 个端点
**认证:** 所有端点需要 `current_user` 依赖注入
**错误处理:** 404 资源不存在、403 无权访问

### Task 5: 注册路由

**Objective:** 将 project 路由加入主路由器

**Files:**
- Modify: `backend/app/api/router.py`

**修改:** 添加 `from app.api.work.project import router as project_router` + `api_router.include_router(project_router, prefix="/work", tags=["工作-项目管理"])`

### Task 6: 运行数据库迁移 + 验证

**Objective:** 生成 Alembic 迁移并执行，验证端点

**命令:**
```bash
cd backend
alembic revision --autogenerate -m "add project tables"
alembic upgrade head
```

**验证:**
```bash
# 启动后端
cd backend && uvicorn app.main:app --reload
# 测试端点
curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"username":"test","password":"test"}'
curl http://localhost:8000/api/v1/work/projects -H "Authorization: Bearer <token>"
```

---

## Phase 2: 购物前端（P2）

> 后端已有 11 个完整端点，前端需从空壳改为完整实现

### Task 7: 创建购物 Store

**Files:** Create `frontend/src/plugins/personal/shopping/store.ts`
采用 Zustand（已有后端 API 可用 fetch 封装）

### Task 8: 实现购物列表页

**Files:** Modify `frontend/src/app/[locale]/personal/shopping/page.tsx`
移除空壳占位，实现：商品列表 + 筛选 + 分页 + 新增/编辑 Dialog

### Task 9: 编写 E2E 测试

**Files:** Create `frontend/e2e/shopping.spec.ts`
覆盖：列表渲染、筛选、CRUD、分页

---

## Phase 3: 仪表盘（P3）

> 双仪表盘需设计为动态聚合页

### Task 10: 个人仪表盘

**Files:** Modify `frontend/src/app/[locale]/personal/dashboard/page.tsx`
设计：统计卡片 + 最近活动时间线 + 快速入口

### Task 11: 工作仪表盘

**Files:** Modify `frontend/src/app/[locale]/work/dashboard/page.tsx`
设计：待办任务 + 项目进度 + 最近操作

---

## Phase 4: 健康补全（P4）

### Task 12: 补充健康 UPDATE/DELETE 端点

**Files:** Modify `backend/app/api/personal/health.py`
添加 PUT/DELETE 端点给 foods、exercises、metrics

---

## Phase 5: 档案馆前端（P5）

### Task 13: 实现档案馆页面

> 后端 archives API 完整，前端缺页面

**Files:** Create `frontend/src/app/[locale]/work/archives/page.tsx`

---

## Phase 6: 数据库 Schema（P6）

### Task 14: 运行所有迁移 + 验证

```bash
cd backend
alembic upgrade head
# 验证所有表
docker exec xone-postgres psql -U xone -d xone -c "\dt"
```
