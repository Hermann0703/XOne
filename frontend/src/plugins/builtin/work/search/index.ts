// 全局搜索 — 插件路由定义与页面注册

import type { XOnePlugin } from '@/plugins/types';

export const searchPlugin: XOnePlugin = {
  id: 'work.search',
  nameKey: 'search.title',
  icon: 'Search',
  mode: 'work',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'work.search.main',
      labelKey: 'search.title',
      icon: 'Search',
      path: '/work/search',
      order: 50,
    },
  ],
};

// 页面组件导出
export { default as SearchDashboard } from './SearchDashboard';
