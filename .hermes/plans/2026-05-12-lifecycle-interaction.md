# 生命周期管理交互完善 实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 打通合同生命周期完整交互链——合同列表显示生命周期、合同详情页展示阶段推进面板、阶段手动推进交互

**Architecture:** 前端为主（Next.js 14 + Zustand），后端API已完备无需改动。核心是修复 ContractDetail 路由断连、添加 ContractList 生命周期列、连接 LifecyclePanel 到详情页

**Tech Stack:** Next.js 14, Tailwind CSS, Zustand, TypeScript, FastAPI (backend API ready)

---

## 前置说明

后端已完备：
- `POST /contracts/{id}/lifecycle/advance` — 推进到下一阶段
- `GET /contracts/{id}/lifecycle` — 获取当前生命周期状态
- `GET /contracts/{id}/lifecycle/history` — 获取阶段转换历史
- 合同创建/编辑时绑定 `lifecycle_id` → 自动绑定第一阶段

前端缺失的连接点：
- ContractDetail 页面路由断连（点击"查看合同详情"无响应）
- ContractList 无生命周期列
- LifecyclePanel 已写好但不在任何可访问的页面流中

---

### Task 1: 修复 ContractDetail 路由 — 合同列表可以跳转到详情页

**Objective:** 让 ContractList 的"查看合同详情"按钮能导航到 `/work/contracts/{id}` 详情页

**Files:**
- Modify: `frontend/src/plugins/builtin/work/contracts/ContractList.tsx` (操作列)
- Verify: `frontend/src/app/[locale]/work/contracts/[id]/page.tsx` (检查是否渲染 ContractDetail)

**Step 1: 读取现有文件，定位"查看合同详情"按钮**

```bash
# 查看 ContractList 操作列
```

**Step 2: 修改操作列的查看按钮，添加路由跳转**

在 ContractList.tsx 的操作列中，将"查看"按钮改为使用 `useRouter` 导航：

```tsx
// 确保文件顶部有:
import { useRouter } from 'next/navigation';

// 在组件内:
const router = useRouter();

// 操作列中查看按钮改为:
<Button
  variant="ghost"
  size="icon"
  onClick={() => router.push(`/work/contracts/${contract.id}`)}
  title="查看合同详情"
>
  <Eye className="size-4" />
</Button>
```

**Step 3: 验证 ContractDetail 页面是否能正确接收 contract id**

读取 `frontend/src/app/[locale]/work/contracts/[id]/page.tsx`，确认它从 params 中提取 id，获取合同数据，并渲染 ContractDetail 组件

**Step 4: 构建验证**

```bash
cd frontend && npm run build
```
Expected: PASS，0 errors

**Step 5: 浏览器验证**

1. 登录 → 合同管理 → 合同详情
2. 点击合同的"查看"按钮
3. 确认跳转到详情页并显示合同信息

---

### Task 2: ContractDetail 页集成 LifecyclePanel

**Objective:** 在 ContractDetail 页添加"生命周期"标签页，展示阶段进度、推进按钮和历史日志

**Files:**
- Read: `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`
- Read: `frontend/src/plugins/builtin/work/contracts/LifecyclePanel.tsx`
- Modify: `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`

**Step 1: 审查 ContractDetail.tsx 现有代码**

读取文件，确认：
- 是否有 tabs 结构
- 合同数据如何获取
- 是否有 `lifecycle_id` / `lifecycle_stage_id` 字段

**Step 2: 审查 LifecyclePanel.tsx 接口**

读取文件，确认：
- Props 接口（contractId?）
- 使用的 API 端点
- 渲染逻辑

**Step 3: 在 ContractDetail 添加"生命周期"标签**

如果 ContractDetail 已有 tabs 但缺少生命周期 tab，添加：

```tsx
// 导入 LifecyclePanel
import LifecyclePanel from './LifecyclePanel';

// 在 tabs 中添加:
{ label: '生命周期', value: 'lifecycle' }

// 在 tab content 中添加:
{activeTab === 'lifecycle' && (
  <LifecyclePanel contractId={contract.id} />
)}
```

如果 ContractDetail 还没有 tabs 结构，需要添加 Shadcn/ui Tabs 组件。

**Step 4: 确保 ContractDetail 加载合同的生命周期关联数据**

检查 store 中的 `fetchContract` 或 `getContract` 是否加载了 `lifecycle` 和 `lifecycle_stage` 关系。如果不加载，在 service 调用或 store 中补充 `selectinload`。

**Step 5: 构建验证 + 浏览器验证**

浏览器操作：
1. 导航到合同详情页
2. 点击"生命周期"标签
3. 确认显示阶段进度条
4. 点击"推进"按钮，确认推进到下阶段
5. 确认历史日志显示

---

### Task 3: ContractList 添加生命周期列

**Objective:** 在合同列表表格中添加"生命周期模板"和"当前阶段"两列

**Files:**
- Modify: `frontend/src/plugins/builtin/work/contracts/ContractList.tsx`
- Read: `frontend/src/plugins/builtin/work/contracts/store.ts` (检查 Contract 接口)

**Step 1: 检查 Contract 接口中是否已有 lifecycle 字段**

读取 store.ts 中 `Contract` 接口定义，确认字段：
- `lifecycle_id?: number`
- `lifecycle_stage_id?: number`
- `lifecycle_stage_name?: string` (可能由后端 join 返回)

**Step 2: 如果 Contract 接口缺少 lifecycle 字段，补充**

在 store.ts 的 `Contract` 接口中添加：
```ts
lifecycle_template_name?: string;
lifecycle_stage_name?: string;
lifecycle_stage_color?: string;
```

**Step 3: 确保后端列表接口返回 lifecycle 数据**

检查后端 `GET /contracts` 或 `GET /contracts/list` 的序列化，确保包含 lifecycle 关联字段。如果缺少，在 serializer 中添加 `lifecycle.name` 和 `lifecycle_stage.name`。

（注：如果查询用了 selectinload 加载 lifecycle+lifecycle_stage，序列化应自动包含）

**Step 4: 在 ContractList 表格中添加列**

在表格列定义中添加：

```tsx
// 在列定义数组的合适位置（建议在"状态"列之后）添加:
{
  key: 'lifecycle',
  label: '生命周期',
  render: (_, contract) => {
    if (!contract.lifecycle_template_name) return <span className="text-muted-foreground text-xs">-</span>;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium">{contract.lifecycle_template_name}</span>
        {contract.lifecycle_stage_name && (
          <Badge variant="outline" className="text-[10px] px-1 py-0">
            {contract.lifecycle_stage_name}
          </Badge>
        )}
      </div>
    );
  },
},
```

**Step 5: 构建验证 + 浏览器验证**

浏览器操作：
1. 登录 → 合同管理 → 合同详情
2. 确认表格中有"生命周期"列
3. 如果合同绑定了模板，应显示模板名和当前阶段

---

### Task 4: i18n 补充 — 生命周期相关新键值

**Objective:** 为新增的 UI 文本添加中英文翻译

**Files:**
- Modify: `frontend/messages/zh.json`
- Modify: `frontend/messages/en.json`

**Step 1: 盘点需要新增的 i18n key**

- `work.contracts.detail.tab.lifecycle` → "生命周期" / "Lifecycle"
- `work.contracts.list.column.lifecycle` → "生命周期" / "Lifecycle"
- `work.contracts.lifecycle.advance` → "推进到下一阶段" / "Advance to Next Stage"
- `work.contracts.lifecycle.advanceConfirm` → "确认推进合同 "{name}" 到阶段 "{stage}"？" / ...
- `work.contracts.lifecycle.advanceSuccess` → "已推进到阶段 "{stage}"" / ...
- `work.contracts.lifecycle.currentStage` → "当前阶段" / "Current Stage"
- `work.contracts.lifecycle.stageHistory` → "阶段历史" / "Stage History"
- `work.contracts.lifecycle.noTemplate` → "未绑定生命周期模板" / "No lifecycle template bound"

**Step 2: 在 zh.json 和 en.json 中添加**

在每个文件的 `work.contracts` 命名空间下添加相应键值。

**Step 3: 格式验证**

```bash
python3 -c "import json; json.load(open('frontend/messages/zh.json')); json.load(open('frontend/messages/en.json'))"
```
Expected: 静默通过（无错误输出）

---

### Task 5: 端到端浏览器验证

**Objective:** 完整流程验证：创建合同绑定模板 → 列表查看生命周期 → 详情页推进阶段 → 历史日志

**Step 1: 准备测试数据**
- 确保至少有一个生命周期模板（"标准采购合同流程"，6个阶段）
- 确保至少有一个合同绑定了该模板（或创建新合同绑定）

**Step 2: 验证流程**
1. 合同列表页 → 确认生命周期列显示
2. 点击查看 → 合同详情页 → 确认"生命周期"标签页
3. 生命周期标签 → 确认阶段进度条显示，当前阶段高亮
4. 点击"推进" → 确认推进成功，阶段更新，合同状态同步更新
5. 确认历史日志显示转换记录

**Step 3: 检查控制台**
- 无 JS 错误
- 无 401/404
- 无 hydration mismatch

---

## 文件索引

| 文件 | 操作 |
|------|------|
| `frontend/src/plugins/builtin/work/contracts/ContractList.tsx` | 修改：添加路由跳转+生命周期列 |
| `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx` | 修改：集成 LifecyclePanel 标签 |
| `frontend/src/plugins/builtin/work/contracts/LifecyclePanel.tsx` | 读取：确认接口 |
| `frontend/src/plugins/builtin/work/contracts/store.ts` | 读取/修改：Contract 接口补充 lifecycle 字段 |
| `frontend/src/app/[locale]/work/contracts/[id]/page.tsx` | 读取：确认路由参数传递 |
| `frontend/messages/zh.json` | 修改：补充生命周期 i18n 键 |
| `frontend/messages/en.json` | 修改：补充生命周期 i18n 键 |
| `backend/app/services/contract_service.py` | 读取：确认 `get_contract` 加载 lifecycle 关系 |
| `backend/app/api/work/contracts.py` | 读取：确认列表 API 返回 lifecycle 字段 |

## 不纳入本次范围

- 自动续约 cron 机制 → 后端基础设施较重，单独计划
- 阶段跳转/回退 → 非核心交互，后续按需
- 拖拽排序阶段 → 已实现，不重复
