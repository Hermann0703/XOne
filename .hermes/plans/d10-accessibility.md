# d10 可访问性深化 — 实施计划

**日期**: 2026-05-10
**范围**: XOne 前端 (Next.js 14 + React + shadcn/ui + Tailwind CSS)
**审计来源**: 三份并行侦察报告 (键盘导航、ARIA/屏幕阅读器、语义HTML/焦点/对比度)
**基准**: 57/69 E2E 通过, 构建通过

---

## 审计摘要

| 维度 | 严重 | 中等 | 低 | 已完成 ✓ |
|------|------|------|-----|---------|
| 键盘导航 | 9 | 8 | 5 | 0 |
| ARIA/屏幕阅读器 | 6 | 6 | 4 | 9 |
| 语义HTML/焦点 | 0 | 2 | 3 | — |

已正确实现: Sidebar `<aside>`+aria-label, TabBar tabs+aria-selected, BrandHeader按钮aria-label, Login/Register表单label关联, 装饰性图标aria-hidden, ModeSwitch role="region", UI组件focus-visible样式。

---

## 阶段1: 基础组件修复 (影响面最大)

修复共享 UI/layout 组件，一处改动影响全站。

### 1.1 Dialog — 全量 ARIA + 键盘支持
**文件**: `src/components/ui/dialog.tsx`
**严重性**: CRITICAL — 影响 20+ 使用处

- [ ] 根容器添加 `role="dialog" aria-modal="true"`
- [ ] 添加 `aria-labelledby` / `aria-describedby` 支持 (props)
- [ ] 遮罩添加 `role="button" tabIndex={-1} aria-label="关闭弹窗"`
- [ ] 实现 ESC 键关闭 (keydown 监听)
- [ ] 实现焦点陷阱 (focus trap): Tab/Shift+Tab 在弹窗内循环
- [ ] 打开时自动聚焦到第一个可聚焦元素
- [ ] 关闭后恢复触发元素焦点
- [ ] 关闭按钮添加 `aria-label="关闭"`
- [ ] 给 DialogContent 添加 `tabIndex={-1}` 使其可接受 focus()

### 1.2 Tabs — ARIA tabs 模式 + 键盘导航
**文件**: `src/components/ui/tabs.tsx`
**严重性**: CRITICAL — 影响 ArchiveDetail 等页面

- [ ] TabsList: 添加 `role="tablist" aria-label`
- [ ] TabsTrigger: 添加 `role="tab" aria-selected={isActive} aria-controls={panelId}` + `tabIndex`
- [ ] TabsTrigger: 添加 ArrowLeft/ArrowRight/Home/End 键盘导航
- [ ] TabsTrigger: 添加引用管理 (roving tabindex)
- [ ] TabsContent: 添加 `role="tabpanel" tabIndex={0} aria-labelledby={tabId}` + `id={panelId}`

### 1.3 Form Labels — 全站 label/input 关联
**严重性**: CRITICAL — 影响 20+ 表单控件

涉及文件及需修复项:
- [ ] DataSourceList.tsx: 3 label → 加 htmlFor, 3 Input/Select/Textarea → 加 id
- [ ] DocumentList.tsx: 4 label → 加 htmlFor, 4 Input → 加 id
- [ ] ChatPanel.tsx: 1 label → 加 htmlFor, 1 Input → 加 id
- [ ] MilestoneList.tsx: 5 label → 加 htmlFor, 5 Input → 加 id
- [ ] ContractForm.tsx: 所有 label → 加 htmlFor, 所有 Input/Select → 加 id
- [ ] ArchiveForm.tsx: 所有 label → 加 htmlFor, 所有 Input → 加 id
- [ ] ArchiveDetail.tsx: 文件上传 label/input 关联

**修复模式**: 每个 `<label>名称 *</label>` → `<label htmlFor="field-xxx">名称 *</label>` + `<Input id="field-xxx" ... />`

---

## 阶段2: 交互组件键盘化

非原生交互元素添加键盘支持。

### 2.1 Skip-to-content 跳过链接
**文件**: `src/app/[locale]/layout.tsx` + `src/components/layout/MainContent.tsx`
**严重性**: CRITICAL — 全站缺失

- [ ] layout.tsx body 最前添加 `<a href="#main-content" className="sr-only focus:not-sr-only ...">跳到主内容</a>`
- [ ] MainContent `<main>` 添加 `id="main-content"`

### 2.2 StatCard 可点击卡片键盘化
**文件**: `src/components/ui/card.tsx` + `src/components/shared/StatCard.tsx`
**严重性**: HIGH — 影响所有可点击仪表盘卡片

- [ ] Card: 当有 onClick 时添加 `role="button" tabIndex={0}` + onKeyDown (Enter/Space)
- [ ] 或 StatCard 包装 onClick 时注入键盘处理器

### 2.3 Sidebar 移动端遮罩键盘关闭
**文件**: `src/components/layout/Sidebar.tsx`
- [ ] 遮罩移除 `aria-hidden="true"`，改用 `role="button" aria-label="关闭菜单" tabIndex={-1}`
- [ ] 遮罩添加 `onKeyDown={(e) => e.key === 'Escape' && onMobileClose?.()}`
- [ ] "设置" 按钮传入 `onItemClick` 实现移动端关闭

### 2.4 Storage Dashboard 点击行键盘化
**文件**: `src/plugins/builtin/work/storage/Dashboard.tsx`
- [ ] TableRow 添加 `tabIndex={0} role="button" onKeyDown` (Enter/Space)
- [ ] 编辑/删除按钮移除多余 stopPropagation div 包裹

### 2.5 TabBar 键盘导航修正
**文件**: `src/components/layout/TabBar.tsx`
- [ ] 合并所有 tab 到一个 `role="tablist"` (当前每个 tab 单独一个 tablist)
- [ ] Tab button 添加 ArrowLeft/ArrowRight/Home/End 处理
- [ ] Hamburger 按钮 aria-label 动态更新 (打开/关闭)

### 2.6 ConversationList 键盘导航
**文件**: `src/plugins/builtin/work/knowledge/ConversationList.tsx`
- [ ] 关闭按钮添加 `aria-label`
- [ ] 列表容器添加 Arrow Up/Down 键盘导航 (roving tabindex)

---

## 阶段3: 图标按钮 + 动态内容可访问性

### 3.1 图标按钮 aria-label 补齐
**文件**: 多处
- [ ] ThemeToggle collapsed: 添加 `aria-label`
- [ ] LocaleSwitcher collapsed: 添加 `aria-label`
- [ ] ModeSwitch collapsed: 添加 `aria-label`
- [ ] ThemeToggle title 国际化 (硬编码中文 → t())
- [ ] TabBar 关闭按钮 "Close" 前缀国际化

### 3.2 全局 aria-live 通知区域
**文件**: `src/components/layout/AppShell.tsx` 或 `MainContent.tsx`
- [ ] 添加 `<div role="status" aria-live="polite" className="sr-only" />` 全局通知区
- [ ] 通过 Context/Store 暴露 `announce()` 函数

### 3.3 Table 表头 scope 属性
**文件**: `src/components/ui/table.tsx`
- [ ] TableHead 默认添加 `scope="col"`

### 3.4 Badge 语义修正
**文件**: `src/components/ui/badge.tsx`
- [ ] `<div>` → `<span>`

### 3.5 DialogDescription 补齐
**文件**: 使用 Dialog 的页面
- [ ] 每个 Dialog 确保有对应的 DialogDescription

---

## 阶段4: E2E 可访问性测试 + 验证

### 4.1 新增可访问性 E2E 测试
**文件**: `frontend/e2e/d10-accessibility.spec.ts`

测试用例 (10个):
- [ ] 键盘 Tab 导航通过整个页面
- [ ] Skip-to-content 链接可用
- [ ] Dialog ESC 关闭 + 焦点陷阱
- [ ] Tabs 键盘操作 (Arrow keys)
- [ ] 表单 label 关联检查 (getByLabel)
- [ ] 图标按钮有 aria-label
- [ ] 移动端侧边栏 ESC 关闭
- [ ] 对话列表键盘导航
- [ ] 存储表格行键盘选择
- [ ] 主题/语言切换按钮有 label

### 4.2 验证步骤
- [ ] `npm run build` 零错误
- [ ] `npx playwright test` 零回归 (允许原有 9 auth CRUD 失败)
- [ ] `npx playwright test d10-accessibility.spec.ts` 全部通过
- [ ] git commit + tag `d10-accessibility`

---

## 不做 (范围外)

- KanbanBoard 拖拽键盘替代方案 (复杂度过高，需完整重新设计交互)
- SVG 环形图可访问性 (RightPanel 图表 — 未来数据可视化专项)
- 标题层级全面审查 (已基本合理)
- 色彩对比度全面审计 (深色模式 d4 已做 token 级别保障)

## 改动量估算

| 阶段 | 文件数 | 预计改动行 |
|------|--------|-----------|
| 阶段1 | ~12 | ~250 |
| 阶段2 | ~7 | ~180 |
| 阶段3 | ~10 | ~80 |
| 阶段4 | 1 新文件 | ~150 |
| **合计** | **~30** | **~660** |
