# 台账管理 — 阶段类型 + 通用字典 + 统一入口

## 架构决策

### 两张表
1. **StageType** — 独立表（有 color, default_status 特殊字段）
2. **LookupDict** — 通用字典表（category+code→name，覆盖 security_level/retention_period/rating 等）

### 统一入口
- 页面: `/work/catalog` (台账管理)
- 侧边栏: "系统" 分组下新增 "台账管理" 菜单项
- 页面内有 tabs: 合同类型(跳转现有) | 阶段类型 | 密级管理 | 字典管理

---

## StageType 模型

```python
class StageType(TimestampMixin, Base):
    __tablename__ = "stage_types"
    id: int PK auto
    user_id: UUID FK → users.id
    name: str(64)          # 显示名称
    code: str(32) UNIQUE   # 英文编码: drafting/review/signing/execution/renewal/termination/archived/custom
    color: str(16)         # hex 颜色
    default_status: str(32)# 默认合同状态: draft/signed/in_progress/completed/terminated
    description: str|None
    sort_order: int=0
    is_active: bool=True
    UniqueConstraint(user_id, code)
```

播种 8 种默认值：
| name | code | color | default_status |
|------|------|-------|---------------|
| 拟定 | drafting | blue | draft |
| 审核 | review | amber | draft |
| 签署 | signing | green | signed |
| 履约 | execution | purple | in_progress |
| 续约 | renewal | pink | in_progress |
| 终止 | termination | red | terminated |
| 归档 | archived | gray | completed |
| 自定义 | custom | gray | draft |

## LookupDict 模型

```python
class LookupDict(TimestampMixin, Base):
    __tablename__ = "lookup_dicts"
    id: int PK auto
    user_id: UUID FK → users.id
    category: str(32)      # 分类: security_level | retention_period | rating
    code: str(64)          # 英文编码
    name: str(64)          # 显示名称
    sort_order: int=0
    is_active: bool=True
    UniqueConstraint(user_id, category, code)
```

播种默认值：
- security_level: public→公开, internal→内部, secret→秘密, confidential→机密
- retention_period: permanent→永久, long_term→长期, short_term→短期, 30_years→30年, 10_years→10年

---

## API 端点设计

### StageType 端点 (5+1):
- GET    /api/v1/work/contracts/stage-types           # 列表
- POST   /api/v1/work/contracts/stage-types           # 创建
- GET    /api/v1/work/contracts/stage-types/{id}      # 详情
- PATCH  /api/v1/work/contracts/stage-types/{id}      # 更新
- DELETE /api/v1/work/contracts/stage-types/{id}      # 删除
- GET    /api/v1/work/contracts/stage-types/active    # 启用列表(供前端下拉)

⚠️ 路由顺序：必须在 `GET /{contract_id}` 之前！

### LookupDict 端点 (6+1):
- GET    /api/v1/work/lookup/{category}                # 按分类列表
- POST   /api/v1/work/lookup/{category}                # 创建
- GET    /api/v1/work/lookup/{category}/{id}           # 详情
- PATCH  /api/v1/work/lookup/{category}/{id}           # 更新
- DELETE /api/v1/work/lookup/{category}/{id}           # 删除
- GET    /api/v1/work/lookup/{category}/active         # 启用列表

Lookup 端点写在 work 模块下，新建 `backend/app/api/work/lookup.py`，在 `backend/app/api/work/__init__.py` 注册。

### 已有 Classification 端点（复用，不新建）:
- GET    /api/v1/work/contracts/classifications
- POST   /api/v1/work/contracts/classifications
- GET    /api/v1/work/contracts/classifications/{id}
- PATCH  /api/v1/work/contracts/classifications/{id}
- DELETE /api/v1/work/contracts/classifications/{id}

---

## 后端代码修改

### 模型文件: backend/app/models/contract.py
- 在末尾新增 StageType 模型

### 新建: backend/app/models/lookup.py
- LookupDict 模型

### Schema: backend/app/schemas/contract.py
- 新增 StageTypeCreate/StageTypeUpdate/StageTypeResponse/StageTypeListItem

### 新建: backend/app/schemas/lookup.py
- LookupDictCreate/Update/Response/ListItem

### API: backend/app/api/work/contracts.py
- 新增 StageType 端点 (必须在 GET /{contract_id} 之前)
- **删除** LifecycleStageCreate/Update 的 stage_type pattern 硬编码
- 改为 service 层动态校验

### 新建: backend/app/api/work/lookup.py
- LookupDict 的所有端点

### 新建: backend/app/services/lookup_service.py
- LookupDict CRUD 业务逻辑

### 修改: backend/app/services/contract_service.py
- stage_to_status 字典 → 改为查询 StageType 表获取 default_status

---

## 前端代码

### 新建页面:
1. `/work/catalog/page.tsx` — 台账管理统一入口（tabs 页面）
2. StageTypeList.tsx — 阶段类型列表（CRUD 表格）
3. StageTypeForm.tsx — 阶段类型表单（名称/编码/颜色/默认状态/排序）
4. ClassificationList.tsx — 密级管理列表
5. ClassificationForm.tsx — 密级管理表单
6. LookupDictManager.tsx — 字典管理（category 下拉切换）

### 修改文件:
7. sidebar-config.tsx — "系统"分组新增"台账管理"
8. ContractLifecycleManager.tsx — STAGE_TYPE_LABELS/COLORS/OPTIONS → API 动态加载
9. LifecyclePanel.tsx — STAGE_LABELS/COLORS → API 动态加载
10. ArchiveList.tsx — SECURITY_MAP/RETENTION_MAP → API 动态加载
11. plugins/builtin/work/contracts/index.ts — 导出新组件
12. 新建 plugins/builtin/work/catalog/index.ts — 台账管理插件注册

### i18n: 
- zh.json + en.json 补充 catalog.*, contracts.stageTypes.*, contracts.classifications.*, lookup.* 等 key
