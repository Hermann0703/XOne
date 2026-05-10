# d5 — 移动端 PWA 需求分析（暂存）

> 分析时间：2026-05-10 | 状态：暂缓，优先 Web 端功能完善

## 当前状态

| 能力 | 现状 | 缺口 |
|------|------|------|
| manifest.json | ❌ 不存在 | 需要创建 |
| Service Worker | ❌ 不存在 | 需要实现离线缓存策略 |
| App Icon | ❌ 不存在 | 需要 192×192 + 512×512 PNG |
| viewport | ✅ 已有 `device-width` + `initialScale=1` | 无 |
| theme-color | ✅ 已有 light/dark media 声明 | 需动态跟随应用主题 |
| 响应式布局 | ⚠️ 桌面优先，无移动适配 | 需审计 Sidebar/表格触控 |

## 功能范围（三个层级）

**P0 — 基础可安装（1-2h）**
- `manifest.json` — name/short_name/icons/start_url/display: standalone
- 192×192 + 512×512 图标（从现有 SVG Logo 导出）
- `theme-color` 动态跟随 `data-theme`
- 注册空 Service Worker（满足 Chrome 安装条件）

**P1 — 离线可用（+2-3h）**
- Service Worker 缓存策略：stale-while-revalidate + cache-first
- 离线 fallback 页面
- 缓存 JS/CSS 分块（~90KB first-load JS）
- 动态路由（`/[locale]/...`）缓存处理

**P2 — 移动体验优化（+2-3h）**
- Sidebar 响应式：小屏自动折叠 + 汉堡菜单
- 表格横滚
- 触控目标 ≥44px
- 安全区域适配（iOS notch / Android punch-hole）
- 下拉刷新

## 页面离线价值评级（22 路由）

| 模式 | 页面 | 离线可用价值 |
|------|------|-------------|
| 个人 | dashboard | ★★★ |
| 个人 | assets / accounts / transactions | ★★★ |
| 个人 | reading / media / shopping / health | ★★ |
| 个人 | notifications | ★ |
| 工作 | dashboard | ★★★ |
| 工作 | knowledge | ★★★（AI 需在线） |
| 工作 | project | ★★ |
| 工作 | contracts / archives | ★★ |
| 工作 | storage / search / dispatch | ★★ |
| 公共 | login / register | ★ |

## 推荐方案（分两阶段）

**阶段一（P0+P1）**：next-pwa 插件 → manifest + SW + 离线 fallback + icon
**阶段二（P2）**：独立方向，响应式 UI 改造

## 关键决策点

| 决策 | 推荐 |
|------|------|
| Service Worker 方案 | next-pwa 插件 |
| 图标生成 | 从现有 XOne Logo 导出 |
| 离线策略 | 仅静态资源（P0-P1），API 数据离线需 IndexedDB（P2） |
| 移动适配范围 | Sidebar 折叠 → P2 |

---

> 暂存时间：用户确认先聚焦 Web 端功能完善与优化，移动端 PWA 后续再推进。
