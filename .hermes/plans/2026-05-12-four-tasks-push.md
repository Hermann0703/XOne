# XOne 四项推进计划

> 创建时间: 2026-05-12 | 状态: 待执行

## 任务1：阶段手动推进 — E2E 验证 + 边界修复

**现状**：后端 `advance_contract_stage` + API 端点 + 前端 LifecyclePanel 按钮均已实现。
**待做**：
1. 浏览器验证：打开合同详情页，点击"推进"按钮，确认阶段推进 + 阶段日志写入 + 合同 status 自动更新
2. 边界修复（如发现问题）：最后阶段禁用、未绑定模板时的友好提示、推进后页面数据刷新
3. 流转历史显示当前阶段日期

**预估**：1 轮调试

## 任务2：自动续约 cron 实现

**现状**：无。docker-compose 已有 Celery Beat。
**待做**：
1. Contract 模型添加 `auto_renewal` (bool) + `renewal_notify_days` (int) 字段
2. Alembic 迁移
3. 后端 `contract_service.check_renewals()` 函数：查询 `status=in_progress`、当前阶段为 `execution`、`end_date` 临近的合同
4. Celery 定时任务：每天检查，自动推进到 `renewal` 阶段
5. 前端合同编辑/详情页加入自动续约开关

**预估**：后端 2 小时，前端 0.5 小时

## 任务3：Docker 生产镜像构建验证

**现状**：Dockerfile.backend / Dockerfile.frontend / docker-compose.yml 就绪。
**待做**：
1. `docker build -f docker/Dockerfile.backend -t xone-backend:test .` — 验证后端镜像构建
2. `docker build -f docker/Dockerfile.frontend -t xone-frontend:test .` — 验证前端镜像构建（含 `next build`）
3. 修复合规问题（如有）
4. 启动完整容器栈验证

**预估**：视构建成败，1-3 轮

## 任务4：供应商管理模块完善

**现状**：后端 CRUD 全部完成，前端有 SupplierList + SupplierForm。
**待做**：
1. 检查供应商页面路由是否正确挂载
2. 检查 SupplierForm 是否遵循 ContractForm 标准（银行账号、数字人民币等字段）
3. 检查 i18n 键值完整性
4. 端到端验证：创建 → 列表 → 编辑 → 删除

**预估**：1 轮补全 + 验证

---

**执行策略**：按任务 1→2→3→4 顺序，每个完成后立即验证。
