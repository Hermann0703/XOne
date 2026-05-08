// 内建插件注册
// 在应用启动时调用 registerBuiltinPlugins() 批量注册系统插件

import { pluginRegistry } from '../registry';
import type { XOnePlugin } from '../types';
import { contractsPlugin } from './work/contracts';
import { archivesPlugin } from './work/archives';
import { knowledgePlugin } from './work/knowledge';
import { dispatchPlugin } from './work/dispatch';
import { projectPlugin } from './work/project';
import { readingPlugin } from '../personal/reading';
import { mediaPlugin } from '../personal/media';
import { healthPlugin } from '../personal/health';
import { assetsPlugin } from '../personal/assets';
import { shoppingPlugin } from '../personal/shopping';

/** 设置插件 — 系统设置入口，双模式可用 */
const settingsPlugin: XOnePlugin = {
  id: 'system.settings',
  nameKey: 'plugin.settings.name',
  icon: 'Settings',
  mode: 'both',
  version: '1.0.0',
  description: '系统设置，包括主题、语言、账号管理等',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'system.settings.general',
      labelKey: 'plugin.settings.menu.general',
      icon: 'Settings',
      path: '/settings',
      order: 900,
    },
  ],
};

/** 帮助插件 — 帮助与关于，双模式可用 */
const helpPlugin: XOnePlugin = {
  id: 'system.help',
  nameKey: 'plugin.help.name',
  icon: 'HelpCircle',
  mode: 'both',
  version: '1.0.0',
  description: '帮助中心与关于信息',
  defaultEnabled: true,
  menuItems: [
    {
      id: 'system.help.main',
      labelKey: 'plugin.help.menu.main',
      icon: 'HelpCircle',
      path: '/help',
      order: 999,
    },
  ],
};

/** 所有内建插件 */
const builtinPlugins: XOnePlugin[] = [settingsPlugin, helpPlugin, contractsPlugin, archivesPlugin, knowledgePlugin, dispatchPlugin, projectPlugin, readingPlugin, mediaPlugin, healthPlugin, assetsPlugin, shoppingPlugin];

/**
 * 注册所有内建插件到全局注册表
 * 在应用初始化时调用（如 layout.tsx 或 _app.tsx）
 *
 * @example
 * ```ts
 * // 在 layout.tsx 顶层调用
 * import { registerBuiltinPlugins } from '@/plugins/builtin';
 * registerBuiltinPlugins();
 * ```
 */
export function registerBuiltinPlugins(): void {
  for (const plugin of builtinPlugins) {
    pluginRegistry.register(plugin);
  }
}

export { settingsPlugin, helpPlugin, builtinPlugins };
