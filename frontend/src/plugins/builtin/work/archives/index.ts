// 档案管理 — 插件路由定义与页面注册

import type { XOnePlugin } from '@/plugins/types';

export const archivesPlugin: XOnePlugin = {
  id: 'work.archives',
  nameKey: 'plugin.archives.name',
  icon: 'FolderOpen',
  mode: 'work',
  version: '1.0.0',
  description: '档案管理、借阅、鉴定与库房管理',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'work.archives.list',
      labelKey: 'plugin.archives.menu.list',
      icon: 'FolderOpen',
      path: '/work/archives',
      order: 20,
    },
    {
      id: 'work.archives.borrows',
      labelKey: 'plugin.archives.menu.borrows',
      icon: 'BookOpen',
      path: '/work/borrows',
      order: 21,
    },
    {
      id: 'work.archives.appraisals',
      labelKey: 'plugin.archives.menu.appraisals',
      icon: 'ClipboardCheck',
      path: '/work/appraisals',
      order: 22,
    },
    {
      id: 'work.archives.storage',
      labelKey: 'plugin.archives.menu.storage',
      icon: 'Warehouse',
      path: '/work/storage',
      order: 23,
    },
  ],
};

export const ARCHIVE_ROUTES = [
  { path: '/work/archives', label: '档案管理', component: 'ArchiveList', order: 1 },
  { path: '/work/archives/new', label: '新建档案', component: 'ArchiveForm', order: 2 },
  { path: '/work/archives/:id', label: '档案详情', component: 'ArchiveDetail', order: 3 },
  { path: '/work/archives/:id/edit', label: '编辑档案', component: 'ArchiveForm', order: 4 },
  { path: '/work/borrows', label: '借阅管理', component: 'BorrowList', order: 5 },
  { path: '/work/appraisals', label: '鉴定管理', component: 'AppraisalList', order: 6 },
  { path: '/work/storage', label: '库房管理', component: 'StorageManager', order: 7 },
] as const

// 页面组件导出（供各 page.tsx 引用）
export { default as ArchiveList } from './ArchiveList';
export { default as ArchiveForm } from './ArchiveForm';
export { default as ArchiveDetail } from './ArchiveDetail';
export { default as BorrowList } from './BorrowList';
export { default as AppraisalList } from './AppraisalList';
export { default as StorageManager } from './StorageManager';
