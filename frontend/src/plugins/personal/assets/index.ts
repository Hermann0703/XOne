import type { XOnePlugin } from '@/plugins/types';

export const assetsPlugin: XOnePlugin = {
  id: 'personal.assets',
  nameKey: 'plugin.assets.name',
  icon: 'Wallet',
  mode: 'personal',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'personal.assets.dashboard',
      labelKey: 'plugin.assets.menu.dashboard',
      icon: 'PieChart',
      path: '/personal/assets',
      order: 20,
    },
    {
      id: 'personal.assets.accounts',
      labelKey: 'plugin.assets.menu.accounts',
      icon: 'Wallet',
      path: '/personal/assets/accounts',
      order: 21,
    },
    {
      id: 'personal.assets.transactions',
      labelKey: 'plugin.assets.menu.transactions',
      icon: 'ArrowLeftRight',
      path: '/personal/assets/transactions',
      order: 22,
    },
  ],
};
