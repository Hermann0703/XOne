import type { XOnePlugin } from '@/plugins/types';

export const healthPlugin: XOnePlugin = {
  id: 'personal.health',
  nameKey: 'plugin.health.name',
  icon: 'Heart',
  mode: 'personal',
  version: '1.0.0',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'personal.health.dashboard',
      labelKey: 'plugin.health.menu.dashboard',
      icon: 'Heart',
      path: '/personal/health',
      order: 10,
    },
    {
      id: 'personal.health.foods',
      labelKey: 'plugin.health.menu.foods',
      icon: 'Utensils',
      path: '/personal/health/foods',
      order: 11,
    },
    {
      id: 'personal.health.exercises',
      labelKey: 'plugin.health.menu.exercises',
      icon: 'Dumbbell',
      path: '/personal/health/exercises',
      order: 12,
    },
    {
      id: 'personal.health.metrics',
      labelKey: 'plugin.health.menu.metrics',
      icon: 'TrendingUp',
      path: '/personal/health/metrics',
      order: 13,
    },
  ],
};
