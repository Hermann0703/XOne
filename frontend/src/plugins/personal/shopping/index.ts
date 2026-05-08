import type { XOnePlugin } from '@/plugins/types';

export const shoppingPlugin: XOnePlugin = {
  id: 'personal.shopping',
  nameKey: 'plugin.shopping.name',
  icon: 'ShoppingCart',
  mode: 'personal',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'personal.shopping.items',
      labelKey: 'plugin.shopping.menu.items',
      icon: 'ShoppingCart',
      path: '/personal/shopping',
      order: 50,
    },
  ],
};
