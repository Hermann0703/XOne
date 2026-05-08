# XOne 项目开发推进计划 v1.0

> **执行方法论**: superpowers-zh → writing-plans → subagent-driven-development → 验证  
> **钱学森控制论原则**: 先整体后局部，反馈迭代，定性→定量  
> **预计总工期**: 9 周 (5 阶段)

---

## 项目基础信息

| 项目 | 内容 |
|------|------|
| 项目名称 | XOne (个人/工作一体化管理平台) |
| 项目路径 | `/Users/hesse/AI Coding/Hermes/Project/XOne` |
| 前端框架 | Next.js 14+ (App Router) + TypeScript + Tailwind CSS 4 + Shadcn UI |
| UI 组件 | Shadcn UI (主) + Ant Design (数据表格/表单) + Lucide React 图标 |
| 状态管理 | Zustand |
| 图表 | Recharts (轻量) + ECharts (重量分析) |
| 后端 | Python 3.12 + FastAPI + Pydantic v2 |
| 数据库 | PostgreSQL 16 + MongoDB + Qdrant |
| 部署 | Docker Compose (12服务) |

---

## 阶段 0: 资产转移 (1 天)

> 将 dwzx-archive-openmetadata 中可直接复用的资产迁移到 XOne

### P0-0: 档案管理数据模型提取

| 文件路径 | 描述 | 处理方式 |
|----------|------|----------|
| `backend/app/models/archive.py` | 从 ArcArchive/ArcBorrowRecord/ArcAppraisalRecord 提取 Pydantic 模型 | Java → Python Pydantic v2 重写 |
| `backend/app/services/archive_service.py` | 从 ArchiveService.java 提取业务逻辑 | Java → Python 重写 |
| `backend/app/api/work/archives.py` | 从 ArcArchiveResource.java 提取 API 路由 | JAX-RS → FastAPI 转换 |

**执行**: 参照以下 Java 模型文件转换：

```
源文件: dwzx-archive-openmetadata/om-source/openmetadata-service/src/main/java/org/openmetadata/service/archive/model/
目标文件: XOne/backend/app/models/archive.py
```

---

## 阶段一: 骨架搭建 (P0) — 1 周

### 子任务 1: Docker 开发环境

**目标文件**:
- `docker/docker-compose.yml` — 12 服务编排
- `docker/Dockerfile.frontend` — Next.js 开发构建
- `docker/Dockerfile.backend` — FastAPI 开发构建
- `.env.example` — 环境变量模板

**验收标准**: `docker compose up -d` 后所有服务运行正常，`docker compose ps` 显示全部 healthy。

### 子任务 2: Next.js 项目初始化

**目标文件**:
- `frontend/package.json` — 依赖声明
- `frontend/tsconfig.json` — TypeScript 严格模式
- `frontend/tailwind.config.ts` — CSS 变量 + 自适应主题
- `frontend/app/layout.tsx` — 根布局，注入主题 Provider
- `frontend/app/page.tsx` — 入口重定向到 `/personal/dashboard`
- `frontend/components/ui/*` — Shadcn UI 组件初始化

**依赖清单**:
```json
{
  "next": "^14.2",
  "react": "^18.3",
  "typescript": "^5.4",
  "tailwindcss": "^4",
  "zustand": "^4.5",
  "lucide-react": "^0.400",
  "recharts": "^2.12",
  "next-intl": "^3.15",
  "shadcn-ui": "latest"
}
```

**验收**: `npm run dev` 启动成功，访问 localhost:3000 看到"Hello XOne"。

### 子任务 3: FastAPI 项目初始化

**目标文件**:
- `backend/requirements.txt` — Python 依赖
- `backend/app/main.py` — FastAPI 应用入口，CORS 配置
- `backend/app/core/config.py` — Pydantic Settings 统一配置
- `backend/app/core/database.py` — SQLAlchemy async engine + session
- `backend/app/core/mongodb.py` — Motor async client
- `backend/app/models/base.py` — SQLAlchemy Base + 通用字段 mixin

**依赖清单**:
```
fastapi==0.111.0
uvicorn[standard]==0.30.0
sqlalchemy[asyncio]==2.0.31
asyncpg==0.29.0
alembic==1.13.1
motor==3.5.1
pydantic==2.7.4
pydantic-settings==2.3.4
```

**验收**: `uvicorn app.main:app --reload` 启动成功，`/docs` 可访问 Swagger UI。

### 子任务 4: 侧边栏组件

**目标文件**:
- `frontend/components/layout/Sidebar.tsx` — 侧边栏主组件
- `frontend/components/layout/SidebarMenuItem.tsx` — 菜单项子组件
- `frontend/components/layout/SidebarGroup.tsx` — 菜单分组（个人区块/工作区块）
- `frontend/components/layout/BrandHeader.tsx` — Logo + 标题
- `frontend/lib/store/sidebar-store.ts` — 折叠/展开 Zustand store

**功能要求**:
- 展开宽度 200px，折叠宽度 64px
- 个人/工作模式切换时动态显隐菜单组
- 当前选中项: 浅紫/浅蓝背景 + 主题色文字
- 悬停: 浅灰背景，transition 150ms
- 折叠状态: 仅图标 + 悬停 Tooltip
- 菜单项逐个加载动画 (stagger 50ms, framer-motion)
- 底部固定"设置"项

**参考**: 前端借鉴案例 3.jpg / 8.jpg

### 子任务 5: 双模式切换系统

**目标文件**:
- `frontend/lib/store/mode-store.ts` — 个人/工作模式 Zustand store
- `frontend/components/layout/ModeSwitch.tsx` — 模式切换按钮/开关
- `frontend/styles/theme-personal.css` — 个人模式 CSS 变量 (暖色调)
- `frontend/styles/theme-work.css` — 工作模式 CSS 变量 (冷色调)
- `frontend/styles/globals.css` — 全局样式 + `[data-mode="personal"]` / `[data-mode="work"]` 选择器

**验收**: 点击切换按钮 → 全页面配色/侧边栏风格即时切换，无需刷新。

### 子任务 6: 标签页系统

**目标文件**:
- `frontend/lib/store/tab-store.ts` — 标签页状态 Zustand store
- `frontend/components/layout/TabBar.tsx` — 顶部标签页栏组件
- `frontend/components/layout/MainContent.tsx` — 主内容区 + 标签页内容渲染

**功能要求**:
- 点击侧边栏菜单 → 新增标签页 (无重复)
- 标签页可关闭 (保留至少一个)
- 模式切换时仅显示当前模式的标签页
- Zustand 缓存每个标签页的滚动位置/表单状态

### 子任务 7: 国际化

**目标文件**:
- `frontend/lib/i18n/request.ts` — next-intl 配置
- `frontend/messages/zh.json` — 中文翻译
- `frontend/messages/en.json` — 英文翻译
- `frontend/middleware.ts` — 语言检测中间件

### 子任务 8: 插件注册机制

**目标文件**:
- `frontend/plugins/types.ts` — `XOnePlugin` 接口定义
- `frontend/plugins/registry.ts` — 插件注册表 (Map)
- `frontend/plugins/usePlugins.ts` — 获取当前模式可用插件的 Hook
- `frontend/plugins/plugin-loader.ts` — 动态 import 插件

---

## 阶段二: 个人模式 MVP (P1) — 2 周

### 子任务 9: 健康仪表盘

**目标文件**:
```
frontend/plugins/personal/health/
├── index.tsx          # 插件入口 + 路由注册
├── Dashboard.tsx      # 健康仪表盘 (KPI卡片 + 图表)
├── FoodRecord.tsx     # 饮食记录列表
├── FoodForm.tsx       # 饮食录入表单
├── ExerciseCalendar.tsx # 运动日历
├── BodyMetrics.tsx    # 身体指标趋势
└── store.ts           # 健康模块 Zustand store
```

**后端 API**:
- `GET/POST /api/v1/personal/health/foods`
- `GET/POST /api/v1/personal/health/exercises`
- `GET/POST /api/v1/personal/health/metrics`
- `GET /api/v1/personal/health/dashboard`

### 子任务 10: 资产管理

**目标文件**:
```
frontend/plugins/personal/assets/
├── index.tsx
├── Dashboard.tsx      # 资产总览 (净资产/总资产/总负债)
├── AccountList.tsx    # 账户列表
├── TransactionList.tsx # 交易记录
├── AssetCharts.tsx    # ECharts 趋势/饼图
└── store.ts
```

**后端 API**:
- `/api/v1/personal/assets/accounts`
- `/api/v1/personal/assets/transactions`
- `/api/v1/personal/assets/dashboard`
- `/api/v1/personal/assets/stats`

### 子任务 11: 阅读管理

**后端 API**: `/api/v1/personal/reading/books`, `/api/v1/personal/reading/notes`
**前端页面**: 书籍列表 + 豆瓣搜索集成 + 笔记编辑器(Markdown)

### 子任务 12: 观影管理

**后端 API**: `/api/v1/personal/media/movies`, `/api/v1/personal/media/watch-records`
**前端页面**: 影视列表 + TMDB 搜索集成 + 影评编辑器

### 子任务 13: 购物清单

**后端 API**: `/api/v1/personal/shopping/budget`, `/api/v1/personal/shopping/items`
**前端页面**: 预算仪表盘 + 清单 CRUD + 分类支出环形图

---

## 阶段三: 工作模式核心 (P2) — 3 周

### 子任务 14: 合同管理 — 基础数据

**目标文件**:
```
backend/app/models/contract.py   # Pydantic 模型
backend/app/api/work/contracts.py # API 路由
backend/app/services/contract_service.py

frontend/plugins/work/contracts/
├── index.tsx
├── ContractList.tsx   # 合同台账 (搜索/筛选/导出)
├── ContractForm.tsx   # 新建/编辑合同
├── MilestoneTable.tsx # 付款里程碑
├── ApprovalFlow.tsx   # 审批流
├── Timeline.tsx       # 生命周期时间轴
└── store.ts
```

### 子任务 15: 档案管理 (参照 dwzx-archive-openmetadata)

**数据模型 (Java → Python Pydantic)**:

```python
# 从 Java ArcArchive.java 转换
class ArchiveCreate(BaseModel):
    archive_no: str
    fonds_id: int        # 全宗ID
    category_id: int     # 类别ID
    classification_id: int # 密级ID
    title: str           # 题名
    file_no: Optional[str] = None
    volume_no: Optional[str] = None
    responsible_person: Optional[str] = None
    doc_date: Optional[date] = None
    page_count: Optional[int] = None
    retention_period: Optional[str] = None
    security_level: str = "公开"  # 公开/内部/秘密/机密
    box_id: Optional[int] = None
    description: Optional[str] = None
    keywords: Optional[str] = None
    status: int = 0      # 0草稿 1已归档 2已借出 3已销毁
    files: list[FileUpload] = []
```

**目标文件**:
```
backend/app/models/archive.py         # Archive, BorrowRecord, AppraisalRecord 模型
backend/app/models/fonds.py           # Fonds, Category, Classification 模型
backend/app/api/work/archives.py      # 档案 CRUD API
backend/app/api/work/borrows.py       # 借阅管理 API
backend/app/api/work/appraisals.py    # 鉴定管理 API
backend/app/services/archive_service.py

frontend/plugins/work/archives/
├── index.tsx
├── ArchiveList.tsx     # 档案列表 (Ant Design Table)
├── ArchiveForm.tsx     # 新建/编辑 (复杂表单)
├── ArchiveDetail.tsx   # 档案详情
├── BorrowList.tsx      # 借阅记录
├── BorrowForm.tsx      # 借阅申请
├── AppraisalList.tsx   # 鉴定记录
└── store.ts
```

### 子任务 16: 档案 — 物理存储管理

- 档案盒管理 (box_no, 密集架位置)
- 档案盒 + 密集架 物理位置映射
- 档案盒内档案列表

---

## 阶段四: 工作模式扩展 (P3) — 2 周

### 子任务 17: 数据报送管理

**后端**:
- Celery 定时任务配置
- 数据源连接管理
- 报送执行日志
- 监控面板 API

**前端**: 任务配置表单 + 执行日志列表 + 状态监控面板 (KPI + 折线图)

### 子任务 18: 知识库 + RAG

**后端**:
- MarkItDown 文档解析
- Qdrant 向量化存储 (text-embedding-3-small / bge-large-zh)
- RAG 问答 API
- Meilisearch 全文索引

**前端**: 文档列表 + Markdown 编辑器 + 智能问答面板

### 子任务 19: 项目管理

**前端**: 看板 (react-beautiful-dnd 拖拽) + 甘特图 + 里程碑

---

## 阶段五: 集成与打磨 (P4) — 1 周

### 子任务 20: 全局搜索 + 通知

**后端**:
- Meilisearch 全局索引 (跨模块文档、档案、合同标题)
- 通知服务 (浏览器 Web Push + Email，可选)

### 子任务 21: 认证系统

- JWT + Refresh Token
- 登录/注册页面
- 角色控制(可选，v1 单用户)

### 子任务 22: 生产部署

- Nginx 反向代理配置 + SSL (Let's Encrypt certbot)
- 一键部署脚本
- `docker-compose.prod.yml`

### 子任务 23: 设计审查 + 打磨

- 用 emil-design-eng skill 审查全部页面
- Before/After/Why 表格输出
- 动画过渡、性能优化、无障碍

### 子任务 24: 测试 + 文档

- Pytest 后端 API 测试
- E2E 测试 (Playwright)
- README + 部署文档

---

## 验收检查清单

### P0 检查
- [ ] `docker compose up -d` 一键启动所有服务
- [ ] 侧边栏展开/折叠/悬停正常
- [ ] 个人↔工作模式切换，配色即时变化
- [ ] 标签页可增删，模式切换后标签页过滤正确
- [ ] 中英文切换正常

### P1 检查
- [ ] 健康模块：可录入饮食/运动，仪表盘图表渲染正确
- [ ] 资产模块：可记账，资产总览/趋势图表正确
- [ ] 阅读模块：可录入/搜索书籍，可写笔记
- [ ] 观影模块：可录入/搜索影视，可打卡

### P2 检查
- [ ] 合同：创建→审批→生效→付款里程碑 全流程走通
- [ ] 档案：创建→归档→借阅→归还→销毁 全流程走通
- [ ] 档案盒物理位置管理正常

### P3 检查
- [ ] 数据报送任务可配置/执行/监控
- [ ] 知识库文档解析/向量化/RAG问答可用
- [ ] 项目管理看板/甘特图可用

### P4 检查
- [ ] 全局搜索返回正确结果
- [ ] 用户登录/鉴权正常
- [ ] Nginx SSL 正常，一键部署成功
- [ ] UI 设计审查通过 (emil-design-eng)

---

## 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| Shadcn UI 复杂表单(如档案创建)组件不足 | P2 阻塞 | 复杂表单使用 Ant Design Form，与 Shadcn 混合使用 |
| ECharts 页面级重图表性能问题 | P1 体验 | 使用动态 import + Suspense 懒加载图表组件 |
| Java → Python 档案数据模型转换遗漏 | P2 Bug | 对照 ArcArchive.java 字段逐一 review |
| AI 向量化成本过高 | P3 | 优先使用本地模型 bge-large-zh，仅 1GB 内存 |
| 知识库文档解析质量差 | P3 | MarkItDown 作为主力，复杂 PDF 降级为纯文本 |

---

> **下一步行动**: 从 P0-1 (Docker 开发环境) 开始，使用 `subagent-driven-development` 执行。  
> **执行命令**: 输入 "开始 P0-1" 或 "superpowers-zh继续推进"。
