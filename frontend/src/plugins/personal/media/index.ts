import type { XOnePlugin } from '@/plugins/types';

export const mediaPlugin: XOnePlugin = {
  id: 'personal.media',
  nameKey: 'plugin.media.name',
  icon: 'Film',
  mode: 'personal',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'personal.media.movies',
      labelKey: 'plugin.media.menu.movies',
      icon: 'Film',
      path: '/personal/media',
      order: 40,
    },
  ],
};
