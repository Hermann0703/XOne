// 项目管理插件定义
// 提供看板、甘特图、里程碑等项目管理功能

import type { XOnePlugin } from '@/plugins/types';

export const projectPlugin: XOnePlugin = {
  id: 'work.project',
  nameKey: 'plugin.project.name',
  icon: 'Kanban',
  mode: 'work',
  version: '1.0.0',
  defaultEnabled: false,
  description: '项目管理：看板、甘特图、里程碑追踪',
  menuItems: [
    {
      id: 'work.project.kanban',
      labelKey: 'plugin.project.menu.kanban',
      icon: 'Layout',
      path: '/work/project',
      order: 210,
    },
  ],
};

// 组件导出
export { default as KanbanBoard } from './KanbanBoard';
export { default as GanttChart } from './GanttChart';
export { default as MilestoneList } from './MilestoneList';
export { useProjectStore } from './store';
