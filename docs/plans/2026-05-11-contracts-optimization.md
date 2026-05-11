# 合同管理功能完善优化 — 实施计划

> 创建时间: 2026-05-11  
> 分支: main  
> 目标: 合同字段重命名 + 新增 4 个编码/名称字段 + 日期字段重排  

---

## 侦察结果对照表

| 用户要求 | 现有状态 | 变更类型 |
|---|---|---|
| 需求编号 `requirement_no` | ❌ 不存在 | **新增字段** |
| 标的编号 `subject_no` | ❌ 不存在 | **新增字段** |
| 采购记录编号 `procurement_no` | ❌ 不存在 | **新增字段** |
| 标的名称 `subject_name` | ❌ 不存在 | **新增字段** |
| 标题→合同名称 | `title` String(256) | **仅改标签** (DB 列名不变) |
| 甲方→采购方 | `party_a` String(256) | **仅改标签** |
| 乙方→供应商 | `party_b` String(256) | **仅改标签** |
| 金额→采购金额 | `amount` Float | **仅改标签** |
| 签署日期后+服务开始/结束日期 | `start_date`/`end_date` 已存在 | **仅 UI 重排** |

> **设计决策**: DB 列名保持不变 (`title`, `party_a`, `party_b`, `amount`)，避免破坏现有数据和生产迁移。仅修改所有显示标签、API 描述和前端字段名。

---

## 新增字段规范

三个编码字段约束（后端+前端双重校验）：
- 格式: 字母 + `-` + 数字组合
- 正则: `^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$`
- 最大长度: 32 字符
- 可为空（历史数据无此字段）

`subject_name`：String(256)，可为空。

---

## 分阶段实施

### 阶段 1: 后端模型 + Schema (子代理 1)

**1.1 模型** — `backend/app/models/contract.py`
- Contract 表新增 4 列：
  ```python
  requirement_no = Column(String(32), nullable=True, comment="需求编号")
  subject_no = Column(String(32), nullable=True, comment="标的编号")
  procurement_no = Column(String(32), nullable=True, comment="采购记录编号")
  subject_name = Column(String(256), nullable=True, comment="标的名称")
  ```

**1.2 Pydantic Schema** — `backend/app/api/work/contracts.py`
- `ContractCreate` 新增 4 个可选字段，含 `pattern=` 正则校验
- `ContractUpdate` 新增 4 个可选字段
- `ContractResponse` 新增 4 个字段
- 更新字段 `description` 中文名（title→合同名称, party_a→采购方, party_b→供应商, amount→采购金额）

**1.3 验证** — `python -c "from app.models.contract import Contract; print([c.name for c in Contract.__table__.columns])"`

### 阶段 2: 数据库迁移 (子代理 2)

```bash
cd backend && alembic revision --autogenerate -m "add contract code fields"
```
验证: `alembic upgrade head` 在测试环境执行。

### 阶段 3: 前端改造 (子代理 3)

**3.1 Store 类型** — `frontend/src/plugins/builtin/work/contracts/store.ts`
- Contract 接口新增 `requirement_no`, `subject_no`, `procurement_no`, `subject_name`

**3.2 表单** — `frontend/src/plugins/builtin/work/contracts/ContractForm.tsx`
- 标签改名: 标题→合同名称, 甲方→采购方, 乙方→供应商, 金额→采购金额
- 新增表单字段: 需求编号, 标的编号, 标的名称, 采购记录编号（4 个）
- 日期重排: 签署日期 → 服务开始日期 → 服务结束日期
- 前端正则校验三个编码字段

**3.3 列表** — `frontend/src/plugins/builtin/work/contracts/ContractList.tsx`
- 表头改名: 标题→合同名称, 甲方→采购方, 乙方→供应商, 金额→采购金额
- 新增列: 需求编号, 标的名称

**3.4 详情** — `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`
- 标签改名
- 新增 4 个字段显示
- 基本信息区展示: 需求编号, 标的编号, 采购记录编号
- 签约方区改为: 采购方, 供应商
- 标的名称展示在基本信息区

**3.5 i18n** — `messages/zh.json` + `messages/en.json`
- contracts.field 下新增 key

### 阶段 4: 验证 + 提交

```bash
# 后端验证
cd backend && python -c "from app.models.contract import Contract; c=Contract.__table__.columns; print([x.name for x in c])"

# 前端构建验证
cd frontend && npx next build 2>&1 | tail -5

# 提交
git add -A && git commit -m "feat: 合同管理完善 — 新增编码字段+标签重命名+日期重排"
git tag d12
```

---

## 变更文件清单

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `backend/app/models/contract.py` | 修改 | +4 列 |
| `backend/app/api/work/contracts.py` | 修改 | Schema 更新 |
| `backend/alembic/versions/xxxx_add_contract_code_fields.py` | 新建 | 迁移 |
| `frontend/src/plugins/builtin/work/contracts/store.ts` | 修改 | 接口更新 |
| `frontend/src/plugins/builtin/work/contracts/ContractForm.tsx` | 修改 | 标签+字段+重排 |
| `frontend/src/plugins/builtin/work/contracts/ContractList.tsx` | 修改 | 表头+列 |
| `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx` | 修改 | 标签+字段 |
| `frontend/messages/zh.json` | 修改 | +新 key |
| `frontend/messages/en.json` | 修改 | +新 key |

---

## 风险评估

| 风险 | 影响 | 缓解 |
|---|---|---|
| 历史合同无编码字段 | 低 | 新字段 nullable，前端空值显示 `-` |
| 前端构建挂死 | 中 | 清除 `.next` 后重试 |
| 正则校验过严 | 低 | 三段编码格式一致，用同一正则可复用 |

---

## 时间估算

| 阶段 | 预计耗时 |
|---|---|
| 后端模型+Schema | ~3 min |
| 数据库迁移 | ~1 min |
| 前端改造 | ~8 min |
| 验证+提交 | ~2 min |
| **合计** | **~14 min** |
