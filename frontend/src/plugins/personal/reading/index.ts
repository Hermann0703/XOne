import type { XOnePlugin } from '@/plugins/types';

export const readingPlugin: XOnePlugin = {
  id: 'personal.reading',
  nameKey: 'plugin.reading.name',
  icon: 'Book',
  mode: 'personal',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'personal.reading.books',
      labelKey: 'plugin.reading.menu.books',
      icon: 'Book',
      path: '/personal/reading',
      order: 30,
    },
  ],
};
