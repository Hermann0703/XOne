# 2026-05-15 XOne 合同管理增强：付款计划 / 附件预览 / 详情页修复

> 项目：XOne
> 路径：`/Users/hesse/AI Coding/Hermes/Project/XOne`
> 日期：2026-05-15
> 状态：已完成核心开发与验证，仍存在未提交工作区变更

---

## 1. 今日需求背景

### 1.1 原始业务需求

在 XOne 项目的合同管理模块中，为合同详情页增加“费用付款 / 付款计划”相关功能。

业务特点：

- 不同合同付款方式不同。
- 常见付款方式包括：
  - 两期：首付款、尾款。
  - 三期：首付款、进度款、尾款。
  - 后续可扩展为自定义 N 期。
- 功能直接放在“合同详情页面”中，便于合同查看时同步看到付款进度。

### 1.2 需求确认后的设计原则

- 付款计划与合同履约里程碑语义不同，不复用 milestones，采用独立表。
- 合同金额与付款计划合计采用弱校验：显示差额提醒，但不阻止保存。
- 支持两期 / 三期快速模板。
- 每期付款记录支持：期次名称、预计付款日期、实际付款日期、金额、币种、状态、备注。
- 支持 PDF 附件上传与在线预览，适合付款凭证、发票、验收材料等。
- 附件预览不能直接 iframe API URL，因为 XOne 使用 Bearer Token；前端应以 blob 方式获取并预览。

---

## 2. 今日实施范围

### 2.1 后端

新增合同付款计划与付款附件能力：

- 新增模型：
  - `ContractPayment`
  - `ContractPaymentAttachment`
- 新增数据库迁移：
  - `backend/alembic/versions/b8c2d4e6f8a0_add_contract_payments.py`
- 新增 API：
  - `GET /api/v1/work/contracts/{contract_id}/payments`
  - `POST /api/v1/work/contracts/{contract_id}/payments`
  - `POST /api/v1/work/contracts/{contract_id}/payments/bulk`
  - `PATCH /api/v1/work/contracts/payments/{payment_id}`
  - `DELETE /api/v1/work/contracts/payments/{payment_id}`
  - `PATCH /api/v1/work/contracts/payments/{payment_id}/mark-paid`
  - `POST /api/v1/work/contracts/payments/{payment_id}/attachments`
  - `GET /api/v1/work/contracts/payments/{payment_id}/attachments`
  - `GET /api/v1/work/contracts/payments/attachments/{attachment_id}/preview`
  - `DELETE /api/v1/work/contracts/payments/attachments/{attachment_id}`

核心后端安全设计：

- 所有 payment / attachment 单资源接口必须通过所属合同校验访问权限，避免按主键枚举越权。
- PDF 文件名做路径和响应头安全清洗。
- 上传路径限制在 `uploads/contract-payments` 下。
- 上传大小限制为 20MB。
- PDF 上传校验不仅看扩展名，也校验文件内容以 `%PDF-` 开头。
- 预览接口返回 `FileResponse`，使用 inline PDF 预览。
- PATCH 更新使用 `exclude_unset=True`，支持部分更新。

### 2.2 前端

新增合同详情页付款计划 UI：

- 新增组件：
  - `frontend/src/plugins/builtin/work/contracts/PaymentTable.tsx`
- 修改合同详情页：
  - `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`
- 扩展 Zustand store：
  - `frontend/src/plugins/builtin/work/contracts/store.ts`

付款计划卡片位置：

- 放在合同详情页左侧信息流中。
- 位于“签约方与金额”之后、“日期信息”之前。

付款卡片功能：

- 显示合同金额、计划合计、已付款、未付款、差额。
- 差额不阻断操作，只给出提醒。
- 表格显示付款期次、预计付款、实际付款、金额、状态、附件、备注、操作。
- 支持：
  - 两期模板。
  - 三期模板。
  - 新增付款。
  - 编辑付款。
  - 删除付款。
  - 标记已付款。
  - 上传 PDF。
  - 预览 PDF。
  - 删除附件。

前端实现注意事项：

- XOne 自研 Dialog 与 shadcn/radix 不同，表单内容使用 `DialogBody` / `DialogFooter` 作为 Dialog 直接子级，避免布局被挤成一行。
- 上传 FormData 不手写 `Content-Type`，让浏览器 / axios 自动生成 boundary。
- PDF 预览通过 axios/fetch 获取 Blob，再用 `URL.createObjectURL(blob)` 赋给 iframe。
- 关闭预览弹窗时调用 `URL.revokeObjectURL` 释放资源。

### 2.3 合同详情页只读优化

问题：合同详情页的 Timeline 模板下拉框仍可点击选择，详情页应为只读。

修复：

- 修改 `Timeline.tsx` 增加 `readonly?: boolean` 参数。
- 合同详情页调用 `<Timeline contract={c} readonly />`。
- 编辑页不传 readonly，保持可编辑。

### 2.4 通联数据服务合同详情页错误修复

用户反馈：“查看 通联数据服务合同 详情，出现页面错误”。

诊断过程：

1. 查询数据库确认合同存在：
   - DB id：92
   - 合同编号：`DWCG-IT-006-20260429001`
   - 合同名称：`通联数据服务合同`
2. 直连后端 API：
   - `GET /api/v1/work/contracts/92` 返回 200。
   - `GET /api/v1/work/contracts/92/payments` 返回 200。
3. 浏览器复现：
   - 访问 `/zh/work/contracts/92` 进入错误边界，显示“页面出现了意外错误”。
4. 定位根因：
   - 后端 / 历史数据中的 `keywords` 字段返回字符串：`"通联,2026"`。
   - 前端 TypeScript 接口声明为 `string[]`。
   - 原渲染代码判断 `c.keywords.length > 0` 可以通过，但随后执行 `c.keywords.map(...)`，字符串没有 map 方法，触发 React 客户端渲染错误。

修复：

- 在 `ContractDetail.tsx` 增加 `normalizeKeywords(keywords: unknown): string[]`。
- 数组：逐项转字符串、trim、过滤空值。
- 字符串：按 `[,，、\s]+` 切分。
- 其他值：返回空数组。
- 关键词渲染统一使用 `normalizeKeywords(c.keywords)`。

验证：

- `/zh/work/contracts/92` 正常打开。
- 页面显示“付款计划”。
- 关键词正确拆分为“通联”“2026”。
- 不再出现错误边界。

---

## 3. 今日涉及文件

### 3.1 后端文件

- `backend/app/api/work/contracts.py`
  - 新增付款计划 / PDF 附件 API。
  - 新增上传文件名清洗、路径约束、PDF 魔数校验、FileResponse 预览。
- `backend/app/models/contract.py`
  - 新增 `ContractPayment`、`ContractPaymentAttachment` 模型与关系。
- `backend/app/models/__init__.py`
  - 导出新增模型。
- `backend/app/services/contract_service.py`
  - 新增付款计划 CRUD、模板生成、标记已付款、附件 CRUD / 预览权限查询逻辑。
- `backend/alembic/versions/b8c2d4e6f8a0_add_contract_payments.py`
  - 新增付款计划与附件表。

### 3.2 前端文件

- `frontend/src/plugins/builtin/work/contracts/PaymentTable.tsx`
  - 新增付款计划卡片、表格、弹窗、附件上传与预览。
- `frontend/src/plugins/builtin/work/contracts/store.ts`
  - 新增付款计划 / 附件 API 方法与类型定义。
- `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`
  - 集成 PaymentTable。
  - Timeline 改为 readonly。
  - 修复 keywords 字段类型漂移导致详情页崩溃。
- `frontend/src/plugins/builtin/work/contracts/Timeline.tsx`
  - 增加 readonly 只读控制。

### 3.3 文档文件

- `docs/XOne-开发推进计划.md`
- `docs/XOne-交付报告.md`
- `docs/XOne-项目说明书.md`
- `docs/plans/2026-05-15-contract-payments-and-detail-fix.md`（本文档）

### 3.4 同日其他未提交改动

工作区还存在台账 / 部门相关新增文件与文档改动，属于同日其他推进事项，需提交前单独确认是否纳入同一 commit：

- `backend/alembic/versions/a7f1c3e9d2b4_add_departments_table.py`
- `backend/app/models/department.py`
- `frontend/src/plugins/builtin/work/catalog/CatalogHub.tsx`
- `frontend/src/plugins/builtin/work/catalog/DepartmentForm.tsx`
- `frontend/src/plugins/builtin/work/catalog/DepartmentList.tsx`

---

## 4. 执行过程记录

### 4.1 需求拆解

- 判断付款计划是合同子资源，但不是履约里程碑。
- 选择“独立 payment 表 + attachment 表”的架构。
- 前端直接集成到合同详情页，不新开独立菜单。
- 金额差额采用提醒而非强校验，以适应实际合同付款复杂性。

### 4.2 实现顺序

1. 后端建模与迁移。
2. 后端 service 层权限与 CRUD。
3. 后端 API 层路由。
4. 前端 store 类型与 API 方法。
5. 前端 PaymentTable 组件。
6. 合同详情页集成。
7. Timeline 只读优化。
8. Docker 前端重建，使容器内产物更新。
9. 针对“通联数据服务合同”详情页错误做诊断式修复。

### 4.3 关键排查与修复经验

- Docker 前端源代码修改后必须重建镜像，否则浏览器仍看到旧产物。
- XOne 自研 Dialog 不能照搬 shadcn Radix Dialog 结构，DialogContent 只放标题与关闭按钮，表单内容应放 DialogBody。
- 合同详情页错误边界不一定是 API 失败；本次 API 都是 200，根因是前端字段类型漂移。
- 历史数据 / 后端字段可能与 TS 接口不一致，详情页渲染前应对可变字段做 normalize。
- 对用户反馈的页面错误，应先复现、查 API、查数据、查渲染链，再做最小修复。

---

## 5. 验证结果

### 5.1 基础设施

- `xone-backend`：healthy。
- `xone-frontend`：healthy。
- `xone-postgres`：healthy。
- 前端访问：`http://localhost:3456/login` 返回 200。
- 后端健康检查：`http://localhost:8000/health` 返回 OK。

### 5.2 API 验证

已验证：

- 登录 API 正常。
- `GET /api/v1/work/contracts/92` 返回 200。
- `GET /api/v1/work/contracts/92/payments` 返回 200。
- 通联数据服务合同详情 API 返回：
  - `keywords raw: '通联,2026'`
  - 付款计划为空数组 `[]`。

### 5.3 前端验证

已验证：

- `cd frontend && npx tsc --noEmit` 通过。
- `cd frontend && npm run build` 通过。
- `docker compose -f docker/docker-compose.yml build --no-cache frontend` 通过。
- `docker compose -f docker/docker-compose.yml up -d frontend` 后容器 healthy。
- 浏览器访问 `/zh/work/contracts/92`：
  - 不再显示“页面出现了意外错误”。
  - 显示合同基本信息。
  - 显示“付款计划”卡片。
  - 显示两期 / 三期模板按钮。
  - 显示关键词“通联”“2026”。

### 5.4 当前非阻断警告

`npm run build` 有既有 React Hook dependency warning，未阻断构建：

- `AppShell.tsx` 缺少 `hydrateMode` 依赖。
- `ContractList.tsx` 缺少 `fetchCategories` 依赖。
- `LookupDictList.tsx` 缺少 `activeCategory` 依赖。

---

## 6. 当前工作区状态摘要

截至 2026-05-15 17:15 CST，工作区存在以下变更：

```text
M backend/app/api/work/contracts.py
M backend/app/models/__init__.py
M backend/app/models/contract.py
M backend/app/services/contract_service.py
M docs/XOne-交付报告.md
M docs/XOne-开发推进计划.md
M docs/XOne-项目说明书.md
M frontend/src/plugins/builtin/work/catalog/CatalogHub.tsx
M frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx
M frontend/src/plugins/builtin/work/contracts/Timeline.tsx
M frontend/src/plugins/builtin/work/contracts/store.ts
?? backend/alembic/versions/a7f1c3e9d2b4_add_departments_table.py
?? backend/alembic/versions/b8c2d4e6f8a0_add_contract_payments.py
?? backend/app/models/department.py
?? frontend/src/plugins/builtin/work/catalog/DepartmentForm.tsx
?? frontend/src/plugins/builtin/work/catalog/DepartmentList.tsx
?? frontend/src/plugins/builtin/work/contracts/PaymentTable.tsx
```

说明：

- 合同付款计划相关核心文件集中在 contracts 后端 / 前端路径。
- 部门 / 台账相关文件是同日其他工作内容，提交前建议分组审查。

---

## 7. 后续建议

### 7.1 提交前建议

- 将“合同付款计划 + 详情页修复”作为一个独立 commit。
- 将“部门 / 台账管理”作为另一个独立 commit。
- 提交前再次运行：

```bash
cd frontend && npx tsc --noEmit
cd frontend && npm run build
curl http://localhost:8000/health
```

### 7.2 后续增强项

- 增加付款计划 Playwright E2E 测试。
- 增加附件上传 / 预览 / 删除的 API 自动化测试。
- 未来可扩展发票号、付款账户、审批状态、付款凭证类型。
- 未来可引入 MinIO 存储替换本地 `uploads/contract-payments`。
- 对历史字段做一次全量梳理：如 keywords、JSON 列、日期字段，统一前后端 schema。

---

## 8. 今日结论

今日完成了合同详情页“付款计划”功能的核心闭环：

- 后端数据模型与 API 已建立。
- 前端详情页已集成付款计划 UI。
- 支持两期 / 三期模板、付款 CRUD、PDF 附件上传与预览。
- 修复了通联数据服务合同因 keywords 字段类型漂移导致的详情页崩溃。
- 完成 TypeScript、Next.js build、Docker 前端重建、浏览器页面复验。

该功能已达到可继续业务试用的状态。
