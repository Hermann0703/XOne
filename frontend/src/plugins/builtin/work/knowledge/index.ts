// 知识库+RAG 插件定义

import type { XOnePlugin } from '@/plugins/types';

export const knowledgePlugin: XOnePlugin = {
  id: 'work.knowledge',
  nameKey: 'plugin.knowledge.name',
  icon: 'BookOpen',
  mode: 'work',
  version: '1.0.0',
  description: '知识库文档管理与RAG智能问答',
  defaultEnabled: false,
  menuItems: [
    {
      id: 'work.knowledge.docs',
      labelKey: 'plugin.knowledge.menu.docs',
      icon: 'FileText',
      path: '/work/knowledge',
      order: 240,
    },
  ],
};

export { default as DocumentList } from './DocumentList';
export { default as ChatPanel } from './ChatPanel';
