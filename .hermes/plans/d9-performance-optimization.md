# d9 性能优化计划

> 2026-05-10 | 基于 Bundle 分析 + 懒加载审计 + 依赖审计

## 优化项

### 🔴 高优先级 (2项, ~25行)

1. **shadcn CLI 从 dependencies → devDependencies**
   - 文件: `package.json`
   - 改动: 移动 1 行
   - 收益: 移除 ~2MB 生产依赖

2. **assets/health 页面 recharts 二次懒加载**
   - 文件: `src/plugins/personal/assets/AssetsDashboard.tsx`, `src/plugins/personal/health/HealthDashboard.tsx`
   - 改动: 将 recharts 各组件改为 `dynamic(() => import('recharts').then(m => m.XXX))` 或性能等价方式，约 20 行
   - 收益: assets 232kB→~120kB, health 232kB→~120kB（-48%）

### 🟡 中优先级 (2项, ~90行)

3. **6 个未懒加载的页面添加 dynamic()**
   - 文件: personal/dashboard/page.tsx, work/dashboard/page.tsx, personal/media/MovieList, personal/reading/BookList, personal/notifications/NotificationList, work/contracts 子组件
   - 改动: 将内联内容或静态 import 改为 dynamic() 包裹，约 80 行
   - 收益: 每页减少 30-60 kB 首屏 JS

4. **lucide-react 按需导入审查**
   - 检查: grep 所有 `from 'lucide-react'` 的 import，确认无全量导入
   - 改动: 约 10 行（如有问题）
   - 收益: shared chunk -5~10 kB

### 🟢 低优先级 (2项, ~25行)

5. **framer-motion 动态导入**
   - 文件: 扫描所有 `from 'framer-motion'` 的 import
   - 改动: 约 5 行
   - 收益: shared chunk -5 kB

6. **next/image 扩展**
   - 文件: 扫描所有未优化的图片场景
   - 改动: 约 20 行
   - 收益: 图片性能提升

## 执行顺序

1 → 2 → 3 → 4 → 5 → 6（按优先级递减）

## 验证

- `npm run build` 通过且无尺寸异常增长
- 对比优化前后 `next build` 输出的 First Load JS 大小
- E2E 全量 57/69 passing 无回归
