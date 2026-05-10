# d8: 业务插件补完 实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan.

**Goal:** 补齐所有业务插件 i18n 国际化、修复导入路径、添加行内编辑/删除操作、充实瘦插件功能

**Architecture:** 分 4 阶段顺序推进，每阶段独立提交

---

## 阶段 1: i18n 全量补齐

### Task 1.1: 扫描所有插件引用的 i18n key

扫描以下目录所有 .tsx/.ts 文件中 `t("...")` 和 `t('...')` 调用：
- `src/plugins/personal/reading/`
- `src/plugins/personal/media/`
- `src/plugins/personal/health/`
- `src/plugins/personal/assets/`
- `src/plugins/builtin/personal/shopping/`
- `src/plugins/builtin/work/search/`
- `src/plugins/builtin/work/dispatch/`
- `src/plugins/builtin/work/storage/`
- `src/app/[locale]/personal/*/page.tsx`
- `src/app/[locale]/work/*/page.tsx`

输出：所有引用的 i18n key 列表，按插件分组

### Task 1.2: 对比 zh.json 现有 key

将 Task 1.1 输出的 key 列表与 `messages/zh.json` 现有 key 对比，输出缺失 key 列表

### Task 1.3: 补全 zh.json 缺失 key

为每个缺失 key 添加中文翻译值，遵循现有嵌套结构

### Task 1.4: 补全 en.json 对应 key

为每个 key 添加英文翻译

### Task 1.5: 消除组件中硬编码中文

查找所有 .tsx/.ts 中未被 t() 包裹的中文字符串，替换为 t('key') 调用

### Task 1.6: 验证构建

## 阶段 2: shopping 插件导入修复

### Task 2.1: 修复 builtin/index.ts 导入

将 `import { shoppingPlugin } from '../personal/shopping'` 改为 `import { shoppingPlugin } from './personal/shopping'`

对比两个 shopping/index.ts，确保合并丢失的插件定义（menuItems 等）

### Task 2.2: 验证构建

## 阶段 3: reading/media 编辑删除

### Task 3.1: BookList 添加编辑/删除按钮

在每张书籍卡片上添加 Edit 和 Trash 图标按钮，连接 PATCH/DELETE API

### Task 3.2: MovieList 添加编辑/删除按钮

同上

### Task 3.3: 验证构建

## 阶段 4: search/dispatch/storage 补功能

### Task 4.1: search 添加搜索输入+结果展示

### Task 4.2: dispatch 添加文件报送表单+历史列表

### Task 4.3: storage 添加文件上传+管理界面

### Task 4.4: 全量构建验证 + E2E
