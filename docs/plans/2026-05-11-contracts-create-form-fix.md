# 合同管理 — 新建/编辑表单功能修复

**日期**: 2026-05-11  
**标签**: d13  
**状态**: 待执行  
**根因**: 合同模块代码骨架完整（7 个文件有实质内容），但端到端流程因 3 个路由缺失 + 2 个 URL/类型不匹配 + 1 个字段必填不一致而完全不可用。

---

## Bug 清单（侦察发现 10 个）

| # | 严重度 | 类型 | 描述 |
|---|--------|------|------|
| 1 | CRITICAL | 路由缺失 | `/work/contracts/new` 不存在 → 点击"新建合同"空白页 |
| 2 | CRITICAL | 路由缺失 | `/work/contracts/[id]/edit` 不存在 → 点击"编辑"空白页 |
| 3 | CRITICAL | URL 错误 | store.createContract POST `/work/contracts` → 应为 `/work/contracts/contracts` |
| 4 | CRITICAL | 类型不匹配 | keywords: 前端 `string[]` vs 后端 `str` → 提交 422 |
| 5 | CRITICAL | 字段必填不匹配 | fonds_id/category_id/classification_id/buyer/supplier/amount 后端必填，前端可选 → 提交 422 |
| 6 | HIGH | URL 错误 | 空状态 CTA `/contracts/create` → 应为 `/work/contracts/new` |
| 7 | HIGH | 数据格式不匹配 | 仪表盘 by_status/by_type/by_fonds: 前端期待 `Record<string,number>`，后端返回 `[{key,count}]` → 仪表盘全显 `--` |
| 8 | HIGH | 字段名不匹配 | Milestone.planned_date (前端) vs due_date (后端) |
| 9 | MEDIUM | 枚举不一致 | contract_type: 前端有 "sale" 无 "loan"，后端有 "loan" 无 "sale" |
| 10 | LOW | UX | API 错误静默吞掉，用户看不到失败原因 |

---

## 实施计划

### Phase A: 后端修复（1 文件 + 可选迁移）

**Task A1**: 统一 contract_type 枚举 + keywords 类型兼容
- 文件: `backend/app/api/work/contracts.py`
- 修改 `ContractCreate.contract_type` 正则: 加入 `sale`（销售合同）→ `purchase|service|lease|sale|loan|other`
- 修改 `ContractCreate.keywords`: 改为 `Optional[List[str]]` 并添加 validator 同时支持前端数组和后端字符串
- 修改 `ContractUpdate` 同步
- Pydantic validator: 接收 `str | list[str]`，统一序列化为逗号分隔字符串存储

**Task A2** (可选，看用户决定): 后端必填字段放宽
- 当前 fonds_id/category_id/classification_id/buyer/supplier/amount 全部 `Field(...)` 必填
- 如果需要支持空表单提交（表单为空时），放宽为 `Optional` + 默认 `None`
- 合同创建至少需要 contract_no + contract_name 必填

### Phase B: 前端修复 — 路由创建（2 新文件）

**Task B1**: 创建 `/work/contracts/new` 路由页面
- 新建: `frontend/src/app/[locale]/work/contracts/new/page.tsx`
- 渲染 `ContractForm` 组件（mode="create"）
- 面包屑: 合同管理 → 新建合同
- 表单提交 → store.createContract → 成功后跳转列表

**Task B2**: 创建 `/work/contracts/[id]/edit` 路由页面
- 新建: `frontend/src/app/[locale]/work/contracts/[id]/edit/page.tsx`
- 渲染 `ContractForm` 组件（mode="edit"），传入 contractId
- 面包屑: 合同管理 → 编辑合同
- 页面加载时 fetch 合同详情填入表单

### Phase C: 前端修复 — store + 表单（3 文件）

**Task C1**: 修复 store.ts — API URL + 类型对齐
- 文件: `frontend/src/plugins/builtin/work/contracts/store.ts`
- createContract URL: `apiPost('/work/contracts', ...)` → `apiPost('/work/contracts/contracts', ...)`
- keywords 提交前序列化: `keywords?.join(',')` 转字符串
- DashboardData 类型: `by_status/by_type/by_fonds` 从 `Record<string,number>` 改为 `Array<{name:string, count:number}>` (对齐后端)
- 仪表盘渲染逻辑同步修改
- Milestone 字段: 统一使用 `due_date`（对齐后端）

**Task C2**: 修复 ContractForm.tsx — 必填字段 + 类型 + UX
- 表单字段 fonds_id/category_id/classification_id/buyer/supplier/amount 改为必填（与后端对齐）
- keywords 输入改为逗号分隔字符串（与后端对齐）
- 添加 toast 错误提示（替代静默吞错）
- contract_type 选项加入 "loan"（借款合同），移除未使用的 "sale"（或后端同步加入）

**Task C3**: 修复 ContractList.tsx — URL + 仪表盘
- 空状态 CTA: `/contracts/create` → `/work/contracts/new`
- 仪表盘数据渲染: 适配 Array 格式（与 store Task C1 同步）
- i18n: 补充缺失的 toast/success 消息 key

### Phase D: i18n 补全（2 文件）

**Task D1**: 补全合同模块缺失的 i18n key
- `messages/zh.json` + `messages/en.json`
- 新增: `contracts.create.success` / `contracts.update.success` / `contracts.delete.success`
- 新增: `contracts.create.error` / `contracts.update.error`
- 新增: 空状态引导文案 key

### Phase E: 验证

**Task E1**: 构建验证
- `npm run build` 前端
- Python import 验证后端

---

## 依赖关系

```
Phase A (后端) ──┐
                  ├── Phase B (路由) ──┐
                  │                     ├── Phase E (验证)
Phase C (store) ─┘                     │
                  Phase D (i18n) ──────┘
```

- Phase A + C 可并行（不同仓库层）
- Phase B 依赖 ContractForm 组件就绪（已就绪）
- Phase D 可在 C 之后或并行执行

## 预期产出

- 2 个新路由页面 (new, edit)
- 6 个文件修改 (contracts.py, store.ts, ContractForm.tsx, ContractList.tsx, zh.json, en.json)
- 端到端流程: 列表 → 新建 → 表单录入 → 提交 → 回到列表 ✓
