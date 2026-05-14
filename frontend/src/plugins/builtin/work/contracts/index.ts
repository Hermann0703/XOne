// 合同管理插件定义

import type { XOnePlugin } from '@/plugins/types';

export const contractsPlugin: XOnePlugin = {
  id: 'work.contracts',
  nameKey: 'plugin.contracts.name',
  icon: 'FileText',
  mode: 'work',
  version: '1.0.0',
  description: '合同台账、里程碑跟踪与审批',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'work.contracts.list',
      labelKey: 'plugin.contracts.menu.list',
      icon: 'FileText',
      path: '/work/contracts',
      order: 10,
    },
    {
      id: 'work.contracts.fonds',
      labelKey: 'plugin.contracts.menu.fonds',
      icon: 'FolderArchive',
      path: '/work/fonds',
      order: 11,
    },
    {
      id: 'work.contracts.categories',
      labelKey: 'plugin.contracts.menu.categories',
      icon: 'FolderTree',
      path: '/work/categories',
      order: 12,
    },
    {
      id: 'work.contracts.classifications',
      labelKey: 'plugin.contracts.menu.classifications',
      icon: 'Shield',
      path: '/work/classifications',
      order: 13,
    },
  ],
};

// 路由配置（供各 page.tsx 引用组件）
export { default as ContractList } from './ContractList';
export { default as ContractForm } from './ContractForm';
export { default as ContractDetail } from './ContractDetail';
export { default as ContractOverview } from './ContractOverview';
export { default as SupplierList } from './SupplierList';
export { default as SupplierForm } from './SupplierForm';
export { default as FondsManager } from './FondsManager';
export { default as CategoryManager } from './CategoryManager';
export { default as ClassificationManager } from './ClassificationManager';
export { default as ContractLifecycleManager } from './ContractLifecycleManager';
export { default as ContractTypeList } from './ContractTypeList';
export { default as ClassificationList } from './ClassificationList';
export { default as LookupDictList } from './LookupDictList';
export { default as StageTypeList } from './StageTypeList';
