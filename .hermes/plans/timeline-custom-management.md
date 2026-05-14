# 时间轴自定义管理 — 开发计划

## 需求摘要
1. 时间轴配置移入**台账管理**，支持自定义时间轴模板及其节点
2. 预设时间轴节点类型：RAT需求、项目流程、非项目审议流程、请示审批流程、采购需求上报、续约流程、费控流程
3. 合同详情页「时间轴」改为下拉框选择模板，底部 "+" 可自定义添加节点

## 侦察结论

### 已有架构
- 台账管理 → `/frontend/src/plugins/builtin/work/catalog/CatalogHub.tsx` — Tabs 嵌入子列表组件
- 现有 Tabs: 合同类型(ContractTypeList)、阶段类型(StageTypeList)、密级管理、通用字典
- 后端 pattern: Pydantic Schema → `contract_service.py` service → `contracts.py` router
- 前端 pattern: List 组件 + Form Dialog → `apiGet/apiPost/apiPatch/apiDelete`
- 合同模型已有 `lifecycle_id` (FK→lifecycle_templates)，时间轴模式参考此设计
- 合同 status: draft/signed/in_progress/completed/terminated

### 数据模型设计

```sql
-- 时间轴模板
CREATE TABLE timeline_templates (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- 时间轴节点（模板内预设节点）
CREATE TABLE timeline_nodes (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES timeline_templates(id) ON DELETE CASCADE,
    label VARCHAR(128) NOT NULL,         -- 显示名称，如"RAT需求"
    sort_order INTEGER DEFAULT 0,
    date_source VARCHAR(64),             -- 日期来源: sign_date/start_date/end_date/created_at 或 null
    active_statuses JSONB,               -- 哪些合同状态下该节点"已达成"，如 ["signed","in_progress","completed","terminated"]
    icon_type VARCHAR(32) DEFAULT 'circle',
    is_required BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
);
INDEX ON (template_id, sort_order);

-- 合同关联时间轴模板
ALTER TABLE contracts ADD COLUMN timeline_template_id INTEGER REFERENCES timeline_templates(id) ON DELETE SET NULL;

-- 合同自定义临时节点（"+" 按钮添加的）
CREATE TABLE contract_timeline_custom_nodes (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    label VARCHAR(128) NOT NULL,
    date_value DATE,
    sort_order INTEGER DEFAULT 0,
    icon_type VARCHAR(32) DEFAULT 'plus',
    created_at TIMESTAMP DEFAULT now()
);
INDEX ON (contract_id, sort_order);
```

### 预设种子数据

7 个时间轴模板节点（RAT需求、项目流程、非项目审议流程、请示审批流程、采购需求上报、续约流程、费控流程）作为默认模板「标准流程」的预设节点，在新用户首次访问时自动创建。

## 分阶段实施

### Phase 1: 后端模型 + 迁移
**A1. 新增模型**
- 文件: `backend/app/models/contract.py`
- 新增 `TimelineTemplate`、`TimelineNode`、`ContractTimelineCustomNode`
- Contract 模型新增 `timeline_template_id` 列 + relationship

**A2. 生成 Alembic 迁移**
- `docker compose exec backend alembic revision --autogenerate -m "add timeline templates and nodes"` 
- 审查并执行迁移

### Phase 2: 后端 Service + API
**B1. Service 层**
- 文件: `backend/app/services/contract_service.py`
- `list_timeline_templates(db, user_id)` 
- `create_timeline_template(db, user_id, data)`
- `get_timeline_template(db, template_id)`
- `update_timeline_template(db, template_id, data)`
- `delete_timeline_template(db, template_id)`
- `list_timeline_nodes(db, template_id)`
- `create_timeline_node(db, template_id, data)`
- `update_timeline_node(db, node_id, data)`
- `delete_timeline_node(db, node_id)`
- `list_contract_custom_nodes(db, contract_id)`
- `create_contract_custom_node(db, contract_id, data)`
- `delete_contract_custom_node(db, node_id)`
- 种子数据函数: `_seed_default_timeline_template(db, user_id)` — 创建「标准流程」模板 + 7个预设节点

**B2. API 端点**
- 文件: `backend/app/api/work/contracts.py`
- GET/POST `/timeline-templates` — 列表/创建
- GET/PATCH/DELETE `/timeline-templates/{id}` — 详情/更新/删除
- GET/POST `/timeline-templates/{id}/nodes` — 节点列表/创建
- PATCH/DELETE `/timeline-templates/{id}/nodes/{node_id}` — 节点更新/删除
- GET/POST/DELETE `/contracts/{id}/timeline-custom-nodes` — 合同自定义节点
- Contract 的 `_contract_to_dict` 补充 `timeline_template_id`、`timeline_template_name`

### Phase 3: 前端 — 台账管理
**C1. TimelineTemplateList 列表组件**
- 文件: `frontend/src/plugins/builtin/work/contracts/TimelineTemplateList.tsx`
- 表格列：名称、描述、状态、操作（编辑/删除/启用切换）
- CRUD 调用 `/api/v1/work/contracts/timeline-templates`

**C2. TimelineTemplateForm 表单组件**
- 文件: `frontend/src/plugins/builtin/work/contracts/TimelineTemplateForm.tsx`
- 模板基本信息（名称、描述）
- 内嵌节点管理表格 → 添加/删除/排序/编辑节点
- 节点字段：label, date_source(下拉), active_statuses(多选), sort_order, icon_type

**C3. CatalogHub 新增 Tab**
- 文件: `frontend/src/plugins/builtin/work/catalog/CatalogHub.tsx`
- 新增 Tab: `timeline-templates` → "时间轴模板"

### Phase 4: 前端 — 合同详情页改造
**D1. Timeline 组件重构**
- 文件: `frontend/src/plugins/builtin/work/contracts/Timeline.tsx`
- 顶部: Select 下拉框选择时间轴模板（默认当前合同关联的模板）
- 主体: 动态渲染选中模板的 nodes + 合同自定义 ad-hoc nodes
- 底部: "+" 按钮 → 弹出 Dialog 添加临时节点(label, date)
- 删除自定义节点功能

**D2. ContractDetail 适配**
- 文件: `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`
- 传递 `timeline_template_id` 给 Timeline 组件
- 模板切换时回写后端

**D3. ContractForm 新增字段**
- 文件: `frontend/src/plugins/builtin/work/contracts/ContractForm.tsx`
- 新增「时间轴模板」下拉选择（可选，合同创建/编辑时可指定）

**D4. Store 类型更新**
- 文件: `frontend/src/plugins/builtin/work/contracts/store.ts`
- Contract 接口新增 `timeline_template_id?: number`

### Phase 5: 验证
**E1. 后端验证**
- `curl` 测试所有 API 端点
- 种子数据自动创建验证

**E2. 前端验证**
- 台账管理 → 创建模板 + 节点 CRUD
- 合同创建 → 选择模板
- 合同详情 → 切换模板下拉 + "+" 添加自定义节点
- `tsc --noEmit` 类型检查
- `npm run build` 构建验证

---

## 文件清单

| 层 | 文件 | 操作 | 说明 |
|---|------|------|------|
| 模型 | `backend/app/models/contract.py` | 修改 | 新增3个模型 + Contract 加列 |
| 迁移 | `backend/alembic/versions/xxxx_timeline.py` | 新增 | autogenerate |
| Service | `backend/app/services/contract_service.py` | 修改 | 新增 ~15 个函数 |
| Router | `backend/app/api/work/contracts.py` | 修改 | 新增 ~12 个端点 |
| 前端 | `TimelineTemplateList.tsx` | 新增 | 列表页 |
| 前端 | `TimelineTemplateForm.tsx` | 新增 | 创建/编辑弹窗(含节点管理) |
| 前端 | `CatalogHub.tsx` | 修改 | 新增 Tab |
| 前端 | `Timeline.tsx` | 重构 | 下拉+动态渲染+"+" |
| 前端 | `ContractDetail.tsx` | 修改 | 传参适配 |
| 前端 | `ContractForm.tsx` | 修改 | 新增模板选择 |
| 前端 | `store.ts` | 修改 | 新增类型字段 |

## 预估工时
- Phase 1-2 (后端): ~40 分钟
- Phase 3 (台账管理前端): ~30 分钟
- Phase 4 (合同详情改造): ~25 分钟
- Phase 5 (验证): ~15 分钟
