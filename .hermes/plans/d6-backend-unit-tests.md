# d6: XOne 后端单元测试 + 覆盖率

> **状态:** ⚙️ 执行中
> **创建:** 2026-05-10
> **方法论:** superpowers-zh (侦察→plan→subagent-dev-exec→验证)

---

## 侦察摘要

| 维度 | 现状 |
|------|------|
| 端点 | 90+ (auth + 12 业务模块) |
| ORM 模型 | 25+ (14 个模型文件) |
| 服务层 | 16 个 service 文件 |
| 现有测试 | 5 模块 (~700 行): auth, contracts, archives, search(mock), health(浅) |
| 测试框架 | pytest 8+ / pytest-asyncio / httpx+ASGITransport / aiosqlite 内存 |
| 缺失工具 | pytest-cov ✗, pytest-mock ✗, factory-boy ✗ |
| 覆盖盲区 | 10 模块: knowledge, dispatch, project, assets, shopping, health(完整), reading, media, storage, notifications |

---

## 四阶段推进

### P0: 基线建立
- [x] 侦察 (已完成)
- [ ] 安装 pytest-cov → requirements-dev.txt
- [ ] 运行现有 5 模块测试 → 确认全通过
- [ ] 生成基线覆盖率报告 → `pytest --cov=app --cov-report=term`
- [ ] 提交: `d6-0`

### P1: 复杂业务逻辑 (高优先级)
- [ ] `test_knowledge.py` — 文档 CRUD + 批量删除 + 对话管理 + SSE 流式 + RAG (mock LLM)
- [ ] `test_dispatch.py` — 数据源 CRUD + 任务 CRUD + 手动执行 + 日志查询 + 监控面板
- [ ] `test_project.py` — 项目/列/任务/里程碑 CRUD + 列排序 + 任务移动
- [ ] 提交: `d6-1`

### P2: 个人域 CRUD (中优先级)
- [ ] `test_assets.py` — 账户/交易 CRUD + 仪表盘 + 统计
- [ ] `test_shopping.py` — 预算/购物项 CRUD + 仪表盘
- [ ] `test_health.py` — 扩展: 饮食/运动/指标 CRUD + 仪表盘 (已有浅测试)
- [ ] 提交: `d6-2`

### P3: 简单 CRUD (低优先级)
- [ ] `test_reading.py` — 书籍 CRUD
- [ ] `test_media.py` — 影视 CRUD
- [ ] `test_storage.py` — 档案柜/档案盒 CRUD
- [ ] `test_notifications.py` — 通知列表/标记已读
- [ ] 提交: `d6-3`

### 最终: 全量报告 + Tag
- [ ] 全量测试运行: `pytest tests/ -v --cov=app --cov-report=term --cov-report=html`
- [ ] 确认零回归
- [ ] 打 tag `d6-backend-unit-tests`
- [ ] 提交: `d6-4`

---

## 测试模式 (遵循 conftest.py 约定)

每个新测试模块遵循现有模式:
```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_xxx_create(auth_token, async_client):
    response = await async_client.post("/api/v1/xxx/...", json={...})
    assert response.status_code == 200
    assert response.json()["name"] == "..."

@pytest.mark.asyncio
async def test_xxx_list(async_client):
    response = await async_client.get("/api/v1/xxx/...")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_xxx_unauthorized(anon_client):
    response = await anon_client.get("/api/v1/xxx/...")
    assert response.status_code == 401
```

## 子代理分工

每个 P1/P2/P3 阶段使用 **轻量 leaf 并行模式** (无审查)：
- 3 个子代理并行，各负责 1 个测试模块
- toolsets: `['file', 'terminal']`
- 事后批量验证: `pytest tests/ -v --tb=short`

---

## 约束

- 沿用现有 conftest.py fixtures (async_client, anon_client, auth_token)
- SQLite 内存数据库，不依赖外部服务
- 外部依赖 (MongoDB, Qdrant, Meilisearch, Redis) 需 Mock
- 测试文件放 `backend/tests/`，命名 `test_<module>.py`
- 每个 CRUD 操作至少覆盖: 创建成功、列表、详情、更新、删除、未授权
