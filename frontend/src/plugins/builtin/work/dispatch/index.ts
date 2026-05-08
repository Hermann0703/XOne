// 数据报送管理 — 插件路由定义与页面注册

import type { XOnePlugin } from '@/plugins/types';

export const dispatchPlugin: XOnePlugin = {
  id: 'work.dispatch',
  nameKey: 'plugin.dispatch.name',
  icon: 'Upload',
  mode: 'work',
  version: '1.0.0',
  defaultEnabled: false,
  description: '数据源管理、报送任务配置与执行监控',
  menuItems: [
    {
      id: 'work.dispatch.dashboard',
      labelKey: 'plugin.dispatch.menu.dashboard',
      icon: 'BarChart3',
      path: '/work/dispatch',
      order: 230,
    },
  ],
};

// 页面组件导出（供各 page.tsx 引用）
export { default as DataSourceList } from './DataSourceList';
export { default as TaskList } from './TaskList';
export { default as MonitorPanel } from './MonitorPanel';
