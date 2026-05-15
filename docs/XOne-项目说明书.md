# XOne 项目说明书 v2.1

> **项目代号**: XOne  
> **项目定位**: 个人生活/工作管理一体化平台  
> **核心愿景**: 一个界面，两种模式，N个插件 — 让生活与工作在统一入口中有序流转  
> **版本**: v2.1  
> **编制日期**: 2026-05-15  
> **上一版本**: v2.0 (v2-no-lifecycle)  

---

## 目录

1. [项目概述](#1-项目概述)
2. [核心技术架构](#2-核心技术架构)
3. [UI设计系统](#3-ui设计系统)
4. [模块详细设计](#4-模块详细设计)
5. [数据模型设计](#5-数据模型设计)
6. [API设计规范](#6-api设计规范)
7. [部署架构](#7-部署架构)
8. [项目开发推进计划](#8-项目开发推进计划)
9. [附录](#9-附录)

---

## 1. 项目概述

### 1.1 项目背景

当前个人生活管理与工作管理系统通常是割裂的：健康类 App、记账类 App、项目管理工具、文档知识库各自独立运行。每次切换需要上下文重载，数据无法互通。XOne 旨在打破这一藩篱，在一个统一平台中承载个人与工作两个维度的全部管理需求。

### 1.2 产品定位

- **双模式一键切换**: 个人模式（暖色调/极简风）与工作模式（冷色调/紧凑高效排版）
- **微内核 + 插件化**: 核心骨架提供路由、鉴权、主题、国际化、状态管理；业务模块以插件形式接入
- **Docker 一键部署**: 零环境依赖，10 分钟内完成部署
- **AI 就绪**: 项目设计天然面向 AI 辅助开发，TypeScript 严格类型 + Pydantic 数据模型

### 1.3 目标用户

- **个人用户**: 管理健康、资产、阅读、观影等日常生活
- **工作用户**: 管理合同采购、档案、数据报送、知识库等业务流程
- **一人两用**: 同一用户可无缝切换两种身份模式

---

## 2. 核心技术架构

### 2.1 技术选型

| 层次 | 技术 | 选型理由 |
|------|------|----------|
| **前端框架** | Next.js 14+ (App Router) + TypeScript | SSR/SPA 双模，文件路由系统，Turbopack 构建极快 |
| **UI 组件库** | Shadcn UI (主) + Ant Design (数据重页面) | Shadcn 高定制性，AI 友好；AntD 表格/表单成熟 |
| **状态管理** | Zustand | 轻量零样板，天然适合 AI 生成代码 |
| **图标** | Lucide React | 开源现代，与 Shadcn UI 风格统一 |
| **样式方案** | Tailwind CSS 4 + CSS Variables | 语义化设计令牌，暗色/亮色/个人/工作四主题 |
| **图表** | Recharts (轻量) + ECharts (重量分析) | Recharts 用于简单图表，ECharts 用于资产/数据报送 |
| **国际化** | next-intl | App Router 原生支持，SSR 安全 |
| **后端** | Python 3.12 + FastAPI + Pydantic v2 | 类型安全，异步原生，自动生成 OpenAPI 文档 |
| **数据库** | PostgreSQL 16 (主) + MongoDB (文档/日志) | PG 强事务（合同/档案），Mongo 灵活 Schema（知识库） |
| **搜索引擎** | Meilisearch | 轻量级全文搜索，Rust 实现，Docker 友好 |
| **任务队列** | Celery + Redis | 定时报表、数据同步、通知推送 |
| **文件存储** | MinIO (S3 兼容) | 档案附件、知识库文档存储 |
| **向量数据库** | Qdrant | 知识库 RAG 检索 |
| **反向代理** | Nginx + Let's Encrypt | 统一入口，自动 SSL |

### 2.2 项目结构

```
XOne/
├── docker/                    # Docker 编排
│   ├── docker-compose.yml
│   ├── nginx/
│   └── Dockerfile.*
├── frontend/                  # Next.js 前端
│   ├── app/                   # App Router 页面
│   │   ├── (personal)/        # 个人模式路由组
│   │   ├── (work)/            # 工作模式路由组
│   │   └── api/               # 前端 BFF 层
│   ├── components/            # 通用组件
│   │   ├── ui/                # Shadcn UI 基础组件
│   │   ├── layout/            # 布局组件 (Sidebar, Header, TabBar)
│   │   └── plugins/           # 业务插件组件
│   ├── lib/                   # 工具库
│   │   ├── store/             # Zustand stores
│   │   ├── hooks/             # 自定义 hooks
│   │   └── i18n/              # 国际化配置
│   ├── plugins/               # 插件注册中心
│   │   ├── registry.ts        # 插件注册表
│   │   └── types.ts           # 插件接口定义
│   └── styles/                # 全局样式 & 主题
├── backend/                   # FastAPI 后端
│   ├── app/
│   │   ├── main.py
│   │   ├── core/              # 核心配置
│   │   ├── models/            # Pydantic/SQLAlchemy 模型
│   │   ├── api/               # API 路由
│   │   │   ├── personal/      # 个人模式 API
│   │   │   └── work/          # 工作模式 API
│   │   ├── services/          # 业务逻辑
│   │   └── tasks/             # Celery 任务
│   ├── migrations/            # Alembic 数据库迁移
│   └── tests/
├── shared/                    # 前后端共享类型定义
│   └── types/
└── docs/                      # 文档
```

### 2.3 插件架构

XOne 采用**微内核 + 插件化**架构，核心理念：

```
Core Kernel (核心)          Plugin Layer (插件层)
┌─────────────────┐      ┌──────────────────────┐
│ • 路由注册       │      │ 📊 Dashboard          │
│ • 模式切换       │◄────►│ 🏥 健康管理            │
│ • 主题管理       │      │ 💰 投资/资产管理        │
│ • 国际化         │      │ 📚 阅读管理            │
│ • 标签页管理     │      │ 🎬 观影管理            │
│ • 状态管理       │      │ 📋 合同生命周期         │
│ • 通知系统       │      │ 🗄️ 档案管理            │
│ • 权限控制       │      │ 📡 数据报送            │
└─────────────────┘      │ 📖 工作知识库          │
                          │ 📝 项目管理            │
                          └──────────────────────┘
```

**插件接口规范 (TypeScript)**:

```typescript
interface XOnePlugin {
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  description: string;           // 描述
  icon: LucideIcon;              // 图标
  mode: 'personal' | 'work' | 'both'; // 所属模式
  order?: number;                // 侧边栏排序
  routes: RouteConfig[];         // 路由定义
  menuItems?: MenuItem[];        // 子菜单项
  sidebarComponent?: React.FC;   // 侧边栏自定义渲染
  initialState?: Record<string, unknown>; // Zustand store 初始状态
}
```

---

## 3. UI设计系统

### 3.1 设计语言

基于参考案例 "MyLife" 提取的统一设计语言：

| 设计维度 | 规范 |
|----------|------|
| **整体风格** | 现代扁平化 (Flat Design 2.0)，轻量阴影，清晰层级 |
| **布局模式** | 三栏式：侧边栏(固定200px) + 主内容(自适应) + 右侧面板(可选300-350px) |
| **圆角体系** | 卡片 12px，面板 8px，按钮 8px，输入框 8px，标签 20px(全圆角) |
| **阴影层级** | 卡片: `0 1px 3px rgba(0,0,0,0.06)`; 悬浮: `0 4px 12px rgba(0,0,0,0.08)` |
| **间距系统** | 8px 基础单位: 8 / 16 / 24 / 32 / 48 |

### 3.2 配色方案

#### 个人模式 (暖色调/极简风)

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--primary` | `#6366F1` (靛蓝紫) | 品牌主色 |
| `--primary-light` | `#E8E3FF` | 选中背景 |
| `--bg-page` | `#F9FAFB` | 页面背景 |
| `--bg-card` | `#FFFFFF` | 卡片背景 |
| `--bg-sidebar` | `#FFFFFF` | 侧边栏背景 |
| `--text-primary` | `#111827` | 主文字 |
| `--text-secondary` | `#6B7280` | 次要文字 |
| `--border` | `#E5E7EB` | 边框 |

#### 工作模式 (冷色调/紧凑高效)

| 令牌 | 色值 | 用途 |
|------|------|------|
| `--primary` | `#3B82F6` (专业蓝) | 品牌主色 |
| `--primary-light` | `#DBEAFE` | 选中背景 |
| `--bg-page` | `#F1F5F9` | 页面背景 |
| `--bg-card` | `#FFFFFF` | 卡片背景 |
| `--bg-sidebar` | `#1E293B` | 侧边栏(深色) |
| `--text-primary` | `#1E293B` | 主文字 |
| `--text-secondary` | `#64748B` | 次要文字 |
| `--border` | `#CBD5E1` | 边框 |

#### 语义色彩（双模式通用）

| 令牌 | 色值 | 语义 |
|------|------|------|
| `--success` | `#10B981` | 成功/完成/正常 |
| `--warning` | `#F59E0B` | 警告/中等/待处理 |
| `--danger` | `#EF4444` | 危险/错误/逾期 |
| `--info` | `#3B82F6` | 信息/进行中 |

#### 模块分类色 (用于图表/标签/图标)

每个业务模块有独立主题色，用于快速视觉识别：

- 健康: `#34D399` (薄荷绿)
- 资产: `#F59E0B` (金橙)
- 阅读: `#8B5CF6` (薰衣草紫)
- 观影: `#EC4899` (玫红)
- 合同: `#3B82F6` (专业蓝)
- 档案: `#6366F1` (靛蓝紫)
- 数据报送: `#14B8A6` (青绿)
- 知识库: `#F97316` (活力橙)

### 3.3 排版系统

```css
/* Tailwind 对应 */
--font-sans: 'Inter', 'Noto Sans SC', sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* 字号层级 */
.text-h1: 32px / 700  # 页面主标题
.text-h2: 24px / 600  # 区块标题
.text-h3: 18px / 600  # 卡片标题
.text-body: 14px / 400  # 正文
.text-sm: 12px / 400  # 辅助文字
.text-xs: 11px / 400  # 标签/徽章
.text-stat: 36px / 700  # 统计数值
```

### 3.4 侧边栏设计

基于参考案例的侧边栏设计规范：

**展开状态 (宽 200px)**:
```
┌──────────────────┐
│  🔮 XOne         │  ← 品牌 Logo + 标题
├──────────────────┤
│  🏠 仪表盘       │
│  ─────────────── │  ← 分组分隔线
│  🏥 健康管理     │  ← 个人模式菜单组
│  💰 资产管理     │
│  📚 阅读管理     │
│  🎬 观影管理     │
│  ─────────────── │
│  📋 合同管理     │  ← 工作模式菜单组
│  🗄️ 档案管理     │
│  📡 数据报送     │
│  📖 知识库       │
│  📝 项目管理     │
├──────────────────┤
│  ⚙️ 设置         │  ← 底部固定
└──────────────────┘
```

**折叠状态 (宽 64px)**:
- 仅显示图标，悬停出现悬浮 Tooltip 显示菜单名
- 带有分组分隔线（图标间距略大表示分组）

**交互行为**:
- 当前选中项: 浅紫/浅蓝背景 + 主题色文字
- 悬停: 浅灰背景过渡 (transition 150ms)
- 有子菜单项: 右侧箭头图标，点击展开/折叠，箭头旋转动画
- 菜单项逐个加载动画 (stagger 50ms)

### 3.5 顶部标签页设计

```
┌──────────────────────────────────────────────────────┐
│  🏠 仪表盘  🏥 健康  📋 合同管理  📡 数据报送    ✕  │  ← 标签页栏
├──────────────────────────────────────────────────────┤
│  页面内容区                                           │
│  (Zustand 缓存每个标签页的状态，切换不丢失)            │
│                                                      │
│  当模式切换时，仅显示当前模式的标签页                   │
└──────────────────────────────────────────────────────┘
```

- 标签页可动态添加/关闭
- 基于 Zustand 的状态缓存
- 模式切换时自动过滤标签页

### 3.6 组件设计规范

#### KPI 统计卡片

```
┌────────────────┐
│  👟 月步数       │  ← 图标 + 指标名 (text-sm, text-secondary)
│  128,500        │  ← 数值 (text-stat, text-primary)
│  ↑ 12.5% vs 上月 │  ← 趋势 (text-xs, success/danger)
│  ━━━━━━━━━━━    │  ← 迷你趋势图 (可选)
└────────────────┘
```

#### 数据表格

```
┌──────────────────────────────────────────────┐
│  列标题  列标题   列标题         列标题       │  ← 无边框，text-sm, semibold
├──────────────────────────────────────────────┤
│  数据A   数据A    🟢 已完成       ⋮          │  ← 悬停浅灰背景
│  数据B   数据B    🟡 进行中       ⋮          │     行高 48px
│  数据C   数据C    🔴 逾期         ⋮          │
└──────────────────────────────────────────────┘
│  ← 1 2 3 ...  →                             │  ← 分页器
```

#### 进度环/进度条

- 进度条: 8px 高，圆角，浅灰底 + 主题色/渐变色填充
- 进度环: SVG 环形图，中心显示百分比
- 100% 完成自动变 green

---

## 4. 模块详细设计

### 4.1 个人模式模块

#### 4.1.1 健康管理

**功能清单**:
- 饮食记录: 食物数据库（名称/热量/含糖量/安全区标记），每日摄入统计
- 运动日程: 训练/比赛日历，活动类型标签（足球/跑步/健身等）
- 身体指标: 体重/体脂/BMI 趋势图
- 健康仪表盘: 步数/活跃时间/卡路里/睡眠/心率 卡片

**参考**: 前端借鉴案例 1.jpg（健康仪表盘）

**数据模型**:
```sql
-- 食物记录
food_records (id, date, meal_type, food_name, calories, sugar_grams, zone, notes)

-- 运动记录
exercise_records (id, date, type, duration_minutes, calories_burned, intensity, notes)

-- 身体指标
body_metrics (id, date, weight, body_fat_pct, bmi, resting_hr, sleep_hours)
```

#### 4.1.2 投资/资产管理

**功能清单**:
- 多维度资产录入: 现金/股票/基金/房产/保险
- 资产总览仪表盘: 净资产/总资产/总负债 三指标卡片
- 趋势分析: ECharts 折线图/饼图，月度/年度对比
- 账户管理: 银行卡/证券账户/信用卡 余额追踪

**参考**: 前端借鉴案例 3.jpg（财务管理仪表盘）

**数据模型**:
```sql
-- 账户
accounts (id, name, type, balance, currency, institution, notes)

-- 资产记录
assets (id, account_id, type, name, amount, acquisition_date, current_value, notes)

-- 交易记录
transactions (id, account_id, type, category, amount, date, description, tags)
```

#### 4.1.3 阅读管理

**功能清单**:
- 书籍录入: 可选豆瓣/Google Books API 自动填充元数据
- 阅读进度: 开始/完成日期，当前页数/百分比
- 笔记管理: Markdown 笔记，与书籍关联
- 阅读统计: 年度阅读量、分类分布

**数据模型**:
```sql
books (id, title, author, isbn, cover_url, total_pages, category, status, start_date, finish_date, rating, notes)
reading_notes (id, book_id, page, content, created_at)
```

#### 4.1.4 观影管理

**功能清单**:
- 影视录入: TMDB API 自动获取元数据（海报/简介/评分）
- 追剧打卡: 集数追踪，观看日期
- 影评笔记: 评分 + Markdown 影评
- 观影统计: 年度观影量、类型分布、平均评分

**数据模型**:
```sql
movies_shows (id, tmdb_id, title, type, poster_url, year, genre, total_episodes, status, my_rating, notes)
watch_records (id, media_id, episode, watch_date, rating)
```

#### 4.1.5 购物清单

**参考**: 前端借鉴案例 14.jpg（购物管理）

**功能清单**:
- 预算管理: 月度预算设定，消费占比进度条
- 购物清单: 商品名/类别/商店/价格/数量/优先级
- 分类支出: 环形图
- 价格提醒: 降价通知

### 4.2 工作模式模块

#### 4.2.1 合同流程及生命周期管理

**功能清单**:
- 合同创建: 供应商/合同金额/起止日期/付款节点
- 采购协同: 跨部门审批流（可配置流程）
- 付款节点追踪: 里程碑付款计划，逾期提醒，PDF附件
- 合同台账: 搜索/分页/导出
- 供应商管理: 独立供应商 CRUD + 详情 + 多联系人/多银行账户
- 生命周期视图: 时间轴展示合同从创建到归档全过程

**状态机**:
```
草稿 → 审批中 → 已生效 → 执行中 → 到期提醒 → 已完成/已终止
                     ↘ 逾期 ← (付款节点超期)
```

**数据模型**:
```sql
contracts (
  id, contract_no, title, supplier_id, amount, currency,
  start_date, end_date, status, department, owner_id,
  procurement_type, tags, attachments
)

payment_milestones (
  id, contract_id, name, amount, planned_date, actual_date,
  status, payment_method, invoice_no, approver_id
)

contract_approvals (
  id, contract_id, step_order, approver_id, status, comment, timestamp
)
```

#### 4.2.2 公司及业务档案生命周期管理

**参考**: dwzx-archive-openmetadata 项目（Java Spring Boot → 本项目中重写为 Python FastAPI）

**核心实体**:
- **全宗 (Fonds)**: 档案分类顶层，如"行政档案""财务档案""业务档案"
- **类别 (Category)**: 全宗下二级分类
- **密级 (Classification)**: 公开/内部/秘密/机密
- **档案 (Archive)**: 核心实体，含档号/题名/文件编号/卷号/责任者/文件日期/页数/保管期限/密级/归档日期/状态
- **档案盒 (ArchiveBox)**: 物理存储容器，含盒号/密集架位置
- **借阅记录 (BorrowRecord)**: 借阅人/借阅日期/预计归还/实际归还/借阅目的/审批状态
- **鉴定记录 (AppraisalRecord)**: 鉴定人/鉴定结果/销毁日期

**档案状态流转**:
```
草稿(0) → 已归档(1) → 已借出(2) → 已归还(1)
                            ↘ 已逾期(需催还)
                       → 已销毁(3)
```

**借阅状态流转**:
```
待审批(0) → 已批准(1) / 已拒绝(2)
    ↓
已借出(3) → 已归还(4)
    ↘ 已逾期(5)
```

**数据模型** (FastAPI Pydantic):
```python
class ArchiveCreate(BaseModel):
    archive_no: str          # 档号（自动生成或手动）
    fonds_id: int            # 全宗ID
    category_id: int         # 类别ID
    classification_id: int   # 密级ID
    title: str               # 题名
    file_no: str | None      # 文件编号
    volume_no: str | None    # 卷号
    responsible_person: str | None  # 责任者
    doc_date: date | None    # 文件日期
    page_count: int | None   # 页数
    retention_period: str | None  # 保管期限
    security_level: str = "公开"  # 密级
    box_id: int | None       # 档案盒ID
    description: str | None  # 描述
    keywords: str | None     # 关键词
    remark: str | None       # 备注
    status: int = 0          # 状态
    files: list[FileUpload]  # 附件
```

#### 4.2.3 数据报送及备份管理

**功能清单**:
- 报送任务配置: 数据源/目标/频率/Cron 表达式
- 任务监控面板: 运行状态/成功/失败/耗时 指标卡片
- 执行日志: 详细日志 + 错误追踪
- 报表生成: 借助 Celery 定时抓取核心指标
- 数据备份: 数据库定时备份到 MinIO

**数据模型**:
```sql
report_tasks (
  id, name, source_type, source_config, target_type, target_config,
  cron_expression, enabled, last_run_at, last_status, retry_count
)

report_logs (
  id, task_id, start_time, end_time, status, records_processed,
  error_message, result_url
)
```

#### 4.2.4 工作知识库

**功能清单**:
- 文档导入: Markdown/PDF/Word → Markdown 转换（MarkItDown）
- 向量化存储: Qdrant 存储 Embedding
- 智能问答: LLM + RAG 检索增强生成
- 分类管理: 标签/文件夹组织
- 全文搜索: Meilisearch

**技术栈**: 
- 文档解析: MarkItDown
- Embedding: text-embedding-3-small (OpenAI) 或 bge-large-zh
- 向量数据库: Qdrant
- 搜索引擎: Meilisearch

#### 4.2.5 项目管理

**功能清单**:
- 项目创建: 名称/描述/起止日期/成员
- 任务看板: 待办/进行中/已完成 + 拖拽排序
- 甘特图: 时间线视图
- 里程碑追踪: 关键节点进度
- 工时统计

**参考**: 前端借鉴案例 7.jpg（目标管理）

---

## 5. 数据模型设计

### 5.1 核心全局表

```sql
-- 用户
users (
  id UUID PK, username, email, password_hash,
  display_name, avatar_url, default_mode, preferences JSONB,
  created_at, updated_at
)

-- 插件注册
plugins (
  id UUID PK, plugin_id UNIQUE, name, description, icon,
  mode, enabled, config JSONB, version, installed_at
)

-- 标签页状态 (每个用户)
tab_states (
  id UUID PK, user_id FK, plugin_id, tab_title,
  tab_state JSONB, last_active_at
)

-- 系统设置
settings (
  key VARCHAR PK, value JSONB, updated_at
)
```

### 5.2 关系型数据库 (PostgreSQL) 适用表

- 合同及审批（强事务 ACID）
- 档案及借阅（数据完整性约束）
- 用户/认证（安全性）
- 所有配置表

### 5.3 文档数据库 (MongoDB) 适用

- 知识库文档内容（灵活 Schema）
- 用户偏好（非结构化配置）
- 系统日志

### 5.4 向量数据库 (Qdrant)

- 知识库文档向量
- 文件语义检索

---

## 6. API设计规范

### 6.1 统一响应格式

```json
{
  "code": 0,
  "message": "success",
  "data": { ... },
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 150
  }
}
```

### 6.2 路由命名约定

```
GET    /api/v1/personal/health/foods      # 列表
POST   /api/v1/personal/health/foods      # 创建
GET    /api/v1/personal/health/foods/:id  # 详情
PUT    /api/v1/personal/health/foods/:id  # 更新
DELETE /api/v1/personal/health/foods/:id  # 删除

GET    /api/v1/work/archives              # 档案列表
POST   /api/v1/work/archives              # 创建档案
POST   /api/v1/work/archives/:id/borrow   # 借阅档案

GET    /api/v1/work/contracts             # 合同列表
POST   /api/v1/work/contracts/:id/approve # 审批合同
```

### 6.3 API端点总览

| 模块 | 端点前缀 | 主要操作 |
|------|----------|----------|
| 核心 | `/api/v1/core` | 用户/认证/插件管理 |
| 健康 | `/api/v1/personal/health` | CRUD 食物/运动/指标 |
| 资产 | `/api/v1/personal/assets` | CRUD 账户/资产/交易 |
| 阅读 | `/api/v1/personal/reading` | CRUD 书籍/笔记 |
| 观影 | `/api/v1/personal/media` | CRUD 影视/观看记录 |
| 合同 | `/api/v1/work/contracts` | CRUD 合同/里程碑/审批 + 供应商 CRUD |
| 档案 | `/api/v1/work/archives` | CRUD 档案/借阅/鉴定 |
| 数据报送 | `/api/v1/work/reports` | CRUD 任务/日志 |
| 知识库 | `/api/v1/work/knowledge` | 文档/搜索/问答 |
| 项目 | `/api/v1/work/projects` | CRUD 项目/任务 |

---

## 7. 部署架构

### 7.1 Docker Compose 栈

```yaml
services:
  nginx:        # 反向代理 + SSL
  frontend:     # Next.js (port 3456)
  backend:      # FastAPI (port 8000)
  celery:       # 异步任务
  celery-beat:  # 定时任务调度
  postgres:     # 主数据库 (port 5432)
  mongodb:      # 文档数据库 (port 27017)
  redis:        # 缓存/消息队列 (port 6379)
  meilisearch:  # 搜索引擎 (port 7700)
  qdrant:       # 向量数据库 (port 6333)
  minio:        # 对象存储 (ports 9000/9001)
```

### 7.2 一键部署

```bash
git clone https://github.com/hesse/xone.git
cd XOne
cp .env.example .env
# 编辑 .env 配置必要参数
docker compose up -d
# 访问 http://localhost:3456 (前端) 或 http://localhost:8000/docs (API文档)
```

---

## 8. 项目开发推进计划

> **开发方法论**: 遵循钱学森控制论 — 先整体后局部，反馈迭代，定性→定量。  
> **执行策略**: superpowers-zh 方法论 → writing-plans → subagent-driven-development → 验证。  
> **阶段划分**: 5 个阶段，逐步交付可用产品。

### 阶段一: 骨架搭建 (P0: 基础设施) — 预计 1 周

**目标**: 微内核可运行，侧边栏 + 双模式切换 + 空壳页面

| 编号 | 任务 | 产出 |
|------|------|------|
| P0-1 | Docker 环境搭建 (docker-compose.yml + Dockerfile) | 一键启动开发环境 |
| P0-2 | Next.js 项目初始化 (App Router + TypeScript + Tailwind + Shadcn UI) | 空壳前端运行 |
| P0-3 | FastAPI 项目初始化 (Pydantic v2 + Alembic + SQLAlchemy) | 后端骨架 |
| P0-4 | 侧边栏组件开发 (展开/折叠 + 悬停Tooltip + 分组线 + 加载动画) | 侧边栏可交互 |
| P0-5 | 双模式切换 (个人/工作模式 Zustand Store + CSS变量主题) | 一键切换见效 |
| P0-6 | 标签页系统 (Zustand 状态缓存 + 动态增删) | 标签页可用 |
| P0-7 | 国际化框架 (next-intl, 中/英文) | i18n 就绪 |
| P0-8 | 核心插件注册机制 (registry + types) | 插件接口定义完成 |

### 阶段二: 个人模式 MVP (P1) — 预计 2 周

**目标**: 个人模式 4 个模块基本可用

| 编号 | 任务 | 产出 |
|------|------|------|
| P1-1 | 健康管理 — 仪表盘 (KPI卡片 + 图表) | 健康首页 |
| P1-2 | 健康管理 — 饮食记录 (食物数据库 + CRUD) | 饮食管理可用 |
| P1-3 | 健康管理 — 运动日程 (日历 + 训练记录) | 运动管理可用 |
| P1-4 | 资产管理 — 资产总览 (净资产/总资产/总负债) | 资产首页 |
| P1-5 | 资产管理 — 账户管理 + 交易记录 | 记账可用 |
| P1-6 | 资产管理 — ECharts 图表 (趋势/分类) | 图表分析 |
| P1-7 | 阅读管理 — 书籍CRUD + 豆瓣API集成 | 阅读管理可用 |
| P1-8 | 观影管理 — 影视CRUD + TMDB API集成 | 观影管理可用 |
| P1-9 | 购物清单 — 预算 + 清单 + 分类支出 | 购物管理可用 |

### 阶段三: 工作模式核心 (P2) — 预计 3 周

**目标**: 工作模式核心业务模块上线

| 编号 | 任务 | 产出 |
|------|------|------|
| P2-1 | 合同管理 — 全宗/类别/密级基础数据 | 档案分类体系 |
| P2-2 | 合同管理 — 合同CRUD + 台账 | 合同管理可用 |
| P2-3 | 合同管理 — 付款里程碑 + 审批流 | 采购协同可用 |
| P2-4 | 合同管理 — 生命周期视图(时间轴) | 合同全程追踪 |
| P2-5 | 档案管理 — 数据模型 + CRUD API | 档案后端完成 |
| P2-6 | 档案管理 — 档案列表 + 搜索 + 筛选 | 档案浏览页面 |
| P2-7 | 档案管理 — 借阅管理(申请/审批/归还/催还) | 借阅流程可用 |
| P2-8 | 档案管理 — 档案盒/密集架位置管理 | 物理位置管理 |
| P2-9 | 档案管理 — 鉴定记录/销毁管理 | 档案生命周期闭环 |

### 阶段四: 工作模式扩展 (P3) — 预计 2 周

**目标**: 数据报送 + 知识库 + 项目管理

| 编号 | 任务 | 产出 |
|------|------|------|
| P3-1 | 数据报送 — 任务配置 + Cron 管理 | 报送任务配置 |
| P3-2 | 数据报送 — 日志查看 + 监控面板 | 报送监控可用 |
| P3-3 | 知识库 — 文档导入 (MarkItDown) | 文档解析完成 |
| P3-4 | 知识库 — 向量化 + Qdrant + RAG 问答 | 智能问答可用 |
| P3-5 | 知识库 — Meilisearch 全文搜索 | 搜索可用 |
| P3-6 | 项目管理 — 项目CRUD + 看板 | 项目管理可用 |
| P3-7 | 项目管理 — 甘特图 + 里程碑 | 项目追踪可用 |

### 阶段五: 集成与打磨 (P4) — 预计 1 周

**目标**: 系统整体优化、安全加固、部署文档

| 编号 | 任务 | 产出 |
|------|------|------|
| P4-1 | 全局搜索 (跨模块 Meilisearch) | 统一搜索 |
| P4-2 | 通知系统 (浏览器通知 + Email) | 通知可用 |
| P4-3 | 用户认证 (JWT + OAuth2) | 完整鉴权 |
| P4-4 | Nginx 反向代理 + SSL + 一键部署 | 生产就绪 |
| P4-5 | emil-design-eng 设计审查 (全部页面) | UI 打磨完成 |
| P4-6 | E2E 测试 + 性能优化 | 质量保障 |
| P4-7 | 部署文档 + README | 文档齐全 |

### 总时间线

```
Week 1  ████████  P0 骨架搭建
Week 2  ████████  P1 个人模式 MVP
Week 3  ████████  P1 个人模式 MVP (续)
Week 4  ████████  P2 工作模式核心
Week 5  ████████  P2 工作模式核心 (续)
Week 6  ████████  P2 工作模式核心 (续)
Week 7  ████████  P3 工作模式扩展
Week 8  ████████  P3 工作模式扩展 (续)
Week 9  ████████  P4 集成与打磨
```

**总计: 9 周** 可交付完整可用的 XOne v1.0。

---

## 9. 附录

### 9.1 参考项目

- **dwzx-archive-openmetadata**: 档案管理系统（Java Spring Boot），提供档案/借阅/鉴定数据模型参考
- **dwzx-archive / dwzx-archive-v2**: 原东吴证券档案管理项目，提供业务逻辑参考
- **OpenStock**: Next.js + MongoDB 项目结构参考

### 9.2 UI 参考

前端借鉴案例目录: `/Users/hesse/AI Coding/Hermes/Project/XOne/前端借鉴案例/`

| 文件 | 对应模块 |
|------|----------|
| 1.jpg | 健康仪表盘 (参考 KPI 卡片 + 图表布局) |
| 7.jpg | 目标管理 (参考进度条 + 列表 + 右侧面板) |
| 14.jpg | 购物管理 (参考表格 + 预算进度 + 饼图) |
| 3.jpg | 财务管理 (参考三栏布局 + 侧边栏) |
| 8.jpg | 记账界面 (参考侧边栏设计细节) |

### 9.3 关键设计决策记录

1. **为什么不用 OpenMetadata 直接扩展？**  
   OpenMetadata 是 Java/React 重型堆栈，过度设计，不利于快速迭代和 AI 辅助开发。XOne 采用更轻量的 Python FastAPI + Next.js，开发效率更高。

2. **为什么 PostgreSQL + MongoDB 双数据库？**  
   合同和档案需要强事务一致性（ACID），知识库和日志需要灵活 Schema。各取所长。

3. **为什么不直接复制 dwzx-archive 前端？**  
   dwzx-archive 的前端是 Vue 3 + Element Plus + 自定义 API 格式，而 XOne 统一采用 React + Shadcn UI + 标准 REST，技术栈不兼容。可取的是数据模型设计经验。

---

> **文档状态**: 正式版 v2.2  
> **下一步**: 持续优化 — 按需推进新功能与 Bug 修复  
> **负责人**: Hesse (CIO/全栈架构师)  
> **执行方式**: superpowers-zh → subagent-driven-development

## 10. 版本历史

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v0.1 | 2026-05-08 | 初稿，完整设计规划 |
| v1.0 | 2026-05-09 | 完成 P0-P4 全阶段开发交付 |
| v2.0 | 2026-05-11 | 移除合同生命周期管理模块，聚焦核心功能 |
| v2.1 | 2026-05-15 | Docker 端口统一为 3456；Next.js API 代理修复 (localhost→backend:8000)；前后端容器健康检查全面通过 |
| v2.2 | 2026-05-16 | 供应商管理 UI 美化（合并卡片/统一间距/列表主题点缀）；合同表单移除全宗/分类筛选；Supplier 新增 business_scope 字段 |
