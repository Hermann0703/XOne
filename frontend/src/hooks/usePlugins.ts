// usePlugins Hook
// 获取当前模式下的可用插件列表和菜单项

import { useMemo } from 'react';
import { pluginRegistry } from '@/plugins/registry';
import { useModeStore } from '@/stores/mode-store';
import type { XOnePlugin, PluginMenuItem } from '@/plugins/types';

interface UsePluginsReturn {
  /** 当前模式下可用的插件列表 */
  plugins: XOnePlugin[];
  /** 当前模式下所有菜单项（按 order 排序） */
  menuItems: PluginMenuItem[];
  /** 加载状态（当前为同步注册表，始终为 false；预留给未来异步加载场景） */
  isLoading: boolean;
}

/**
 * 获取当前模式下的可用插件和菜单项
 *
 * @example
 * ```tsx
 * const { plugins, menuItems } = usePlugins();
 * // menuItems 已按 order 排序
 * ```
 */
export function usePlugins(): UsePluginsReturn {
  const mode = useModeStore((state) => state.mode);

  const result = useMemo(() => {
    // 当前模式一定是 'personal' 或 'work'（ModeStore 已约束）
    const plugins = pluginRegistry.getByMode(mode);
    const menuItems = pluginRegistry.getMenuItems(mode);

    return {
      plugins,
      menuItems,
      isLoading: false,
    };
  }, [mode]);

  return result;
}
