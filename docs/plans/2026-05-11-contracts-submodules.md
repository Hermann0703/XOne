# 合同管理子模块改造实施计划

## 目标
1. 移除 `buyer`（采购方）字段
2. 合同管理拆分为 3 个子模块：合同总体情况、合同详情、供应商管理
3. 侧边栏支持可折叠子菜单（默认折叠，点击展开/折叠）

---

## Phase A — 后端：Supplier 模型 + API + buyer 移除

### A1. 新建 Supplier 模型
**文件**: `backend/app/models/supplier.py`（新建）

```python
class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"
    id = Column(UUID, primary_key=True, default=uuid4)
    user_id = Column(UUID, ForeignKey("users.id"), nullable=False)
    name = Column(String(256), nullable=False)
    contact_person = Column(String(128))
    contact_phone = Column(String(32))
    address = Column(String(512))
    business_license = Column(String(128))
    tax_id = Column(String(64))
    bank_name = Column(String(256))
    bank_account = Column(String(64))
    rating = Column(String(32))          # A/B/C/D
    status = Column(String(32), default="active")  # active/inactive/blacklisted
    notes = Column(Text)
```

### A2. 修改 Contract 模型
**文件**: `backend/app/models/contract.py`

变更：
- **删除** `buyer` 列
- 将 `supplier` 从纯文本字段改为 FK：`supplier_id = Column(UUID, ForeignKey("suppliers.id"))`

### A3. 新建 Supplier API
**文件**: `backend/app/api/work/contracts.py`（追加）

新增路由组 `/suppliers`：
- `GET    /suppliers` — 供应商列表（分页 + 搜索）
- `POST   /suppliers` — 创建供应商
- `GET    /suppliers/{supplier_id}` — 供应商详情
- `PATCH  /suppliers/{supplier_id}` — 更新供应商
- `DELETE /suppliers/{supplier_id}` — 删除供应商

### A4. 补全 Supplier Service
**文件**: `backend/app/services/contract_service.py`（追加）

新增 5 个方法：`list_suppliers`, `get_supplier`, `create_supplier`, `update_supplier`, `delete_supplier`

### A5. 增强合同总览 API
**文件**: `backend/app/api/work/contracts.py`

增强 `GET /dashboard` 返回数据：
```json
{
  "summary": {
    "total_contracts": 42,
    "total_amount": 5280000.00,
    "active_count": 18,
    "completed_count": 15,
    "terminated_count": 4,
    "draft_count": 5
  },
  "performance": {
    "on_time_rate": 0.85,
    "overdue_count": 3,
    "total_milestones": 156,
    "completed_milestones": 132
  },
  "by_type": [...],
  "monthly_trends": [...],
  "by_fonds": [...],
  "expiring_soon": [...]
}
```

### A6. 更新 Pydantic Schema
**文件**: `backend/app/api/work/contracts.py`

- ContractCreate/ContractUpdate：移除 `buyer`，`supplier`→`supplier_id`
- 新增 SupplierCreate/SupplierUpdate schema
- `_contract_to_dict()` 更新键名

### A7. 数据库迁移
生成 Alembic migration：
- `ALTER TABLE contracts DROP COLUMN buyer`
- `ALTER TABLE contracts DROP COLUMN supplier, ADD COLUMN supplier_id UUID`
- `CREATE TABLE suppliers (...)`

---

## Phase B — 前端：可折叠侧边栏

### B1. 扩展菜单配置类型
**文件**: `frontend/src/components/layout/sidebar-config.tsx`

```ts
export interface SidebarMenuConfigItem
  extends Omit<SidebarMenuItemProps, 'collapsed' | 'index'> {
  /** 子菜单项（存在时父项变为可折叠 toggle） */
  children?: SidebarMenuConfigItem[]
}
```

### B2. 创建可展开菜单项组件
**文件**: `frontend/src/components/layout/SidebarExpandableItem.tsx`（新建）

功能：
- 有 `children` 时：渲染为 toggle 按钮 + 可展开子项列表
- 点击 toggle 展开/折叠子项（使用 `useState` 本地状态）
- 展开时显示 `ChevronDown` / 折叠时 `ChevronRight`
- 子项使用 `SidebarMenuItem` 渲染
- 支持 `defaultExpanded={false}`（默认折叠）
- 当前路由匹配子项 path 时自动展开
- 无 children 时回退到普通 `SidebarMenuItem`

### B3. 修改 SidebarGroup 渲染
**文件**: `frontend/src/components/layout/SidebarGroup.tsx`

- 检测 item 是否有 `children`，有则用 `SidebarExpandableItem`，无则用 `SidebarMenuItem`

### B4. 更新侧边栏配置
**文件**: `frontend/src/components/layout/sidebar-config.tsx`

```tsx
{
  id: 'work.contracts',
  icon: FileText,
  label: '合同管理',
  children: [
    {
      id: 'work.contracts.overview',
      icon: BarChart3,
      label: '合同总体情况',
      path: '/work/contracts/overview',
    },
    {
      id: 'work.contracts.list',
      icon: FileText,
      label: '合同详情',
      path: '/work/contracts',
    },
    {
      id: 'work.contracts.suppliers',
      icon: Building2,
      label: '供应商管理',
      path: '/work/contracts/suppliers',
    },
  ],
}
```

---

## Phase C — 前端：子模块页面

### C1. 合同总体情况页面
**文件**: `frontend/src/app/[locale]/work/contracts/overview/page.tsx`（新建）

- 调用 `/work/contracts/dashboard` API
- 展示：合同统计卡片（总数/金额/状态分布）、履约率、月度趋势图、到期预警

### C2. 合同总体情况组件
**文件**: `frontend/src/plugins/builtin/work/contracts/ContractOverview.tsx`（新建）

- 使用 store 中的 `fetchDashboard` 和 `dashboard` 数据
- 卡片网格 + 简单柱状图（可用纯 CSS 或 recharts）

### C3. 供应商管理页面
**文件**: `frontend/src/app/[locale]/work/contracts/suppliers/page.tsx`（新建）

- 调用 `/work/contracts/suppliers` API
- 功能：列表（含搜索/分页）、新建/编辑弹窗、删除确认

### C4. 供应商管理组件
**文件**: `frontend/src/plugins/builtin/work/contracts/SupplierList.tsx`（新建）

- 供应商数据表格（名称/联系人/电话/评级/状态）
- 新建/编辑表单（Dialog）

### C5. 现有页面适配
- `ContractForm.tsx`: 移除 buyer 字段，supplier 改为下拉选择（从供应商列表加载）
- `ContractDetail.tsx`: 移除 buyer 展示
- `ContractList.tsx`: 移除 buyer 相关列
- `store.ts`: 新增供应商相关 state/methods，移除 buyer 类型定义

---

## Phase D — i18n + 构建验证

### D1. 更新 i18n
**文件**: `frontend/messages/zh.json`, `frontend/messages/en.json`

- 移除 `contracts.field.buyer`
- 新增 `contracts.overview.title`, `contracts.overview.*` 统计标签
- 新增 `contracts.suppliers.title`, `contracts.suppliers.*` 供应商标签

### D2. 构建验证
```bash
npx next build  # TypeScript + 路由验证
```

### D3. 端到端验证
- 侧边栏合同管理折叠/展开
- 三子模块页面渲染
- 供应商 CRUD 流程
- 合同表单 supplier 下拉选择

---

## 变更文件清单（预估 18 文件）

| 文件 | 操作 | Phase |
|------|------|-------|
| `backend/app/models/supplier.py` | 新建 | A1 |
| `backend/app/models/contract.py` | 修改 | A2 |
| `backend/app/api/work/contracts.py` | 修改（追加 suppliers + 修改 contracts） | A3/A5/A6 |
| `backend/app/services/contract_service.py` | 修改（追加 supplier 方法） | A4 |
| `backend/app/models/__init__.py` | 修改（导入 Supplier） | A1 |
| `migrations/versions/xxxx_add_suppliers_remove_buyer.py` | 新建 | A7 |
| `frontend/src/components/layout/SidebarExpandableItem.tsx` | 新建 | B2 |
| `frontend/src/components/layout/SidebarGroup.tsx` | 修改 | B3 |
| `frontend/src/components/layout/sidebar-config.tsx` | 修改 | B1/B4 |
| `frontend/src/plugins/builtin/work/contracts/ContractOverview.tsx` | 新建 | C2 |
| `frontend/src/plugins/builtin/work/contracts/SupplierList.tsx` | 新建 | C4 |
| `frontend/src/app/[locale]/work/contracts/overview/page.tsx` | 新建 | C1 |
| `frontend/src/app/[locale]/work/contracts/suppliers/page.tsx` | 新建 | C3 |
| `frontend/src/plugins/builtin/work/contracts/ContractForm.tsx` | 修改 | C5 |
| `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx` | 修改 | C5 |
| `frontend/src/plugins/builtin/work/contracts/ContractList.tsx` | 修改 | C5 |
| `frontend/src/plugins/builtin/work/contracts/store.ts` | 修改 | C5 |
| `frontend/messages/zh.json` | 修改 | D1 |
| `frontend/messages/en.json` | 修改 | D1 |

---

## 风险与注意
1. 迁移中 `supplier` 列名变更（文本→FK UUID），需确保已有数据兼容（可先 ADD 新列再 DROP 旧列）
2. 侧边栏折叠逻辑需与 `startWith` 路由匹配兼容（子路由激活时父项应展开）
3. `SidebarExpandableItem` 动画需与 framer-motion stagger 动画兼容
