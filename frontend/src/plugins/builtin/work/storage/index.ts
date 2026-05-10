// 存储管理 — 插件路由定义与页面注册

import type { XOnePlugin } from '@/plugins/types';

export const storagePlugin: XOnePlugin = {
  id: 'work.storage',
  nameKey: 'storage.title',
  icon: 'Archive',
  mode: 'work',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'work.storage.main',
      labelKey: 'storage.title',
      icon: 'Archive',
      path: '/work/storage',
      order: 60,
    },
  ],
};

// 页面组件导出
export { default as Dashboard } from './Dashboard';
