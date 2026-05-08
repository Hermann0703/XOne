// XOne 插件注册表
// 全局单例，管理所有已注册插件的生命周期

import type { XOnePlugin, PluginMenuItem } from './types';

export class PluginRegistry {
  private plugins = new Map<string, XOnePlugin>();

  /**
   * 注册一个插件
   * 如果插件 ID 已存在则覆盖（热重载场景）
   */
  register(plugin: XOnePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginRegistry] 插件 "${plugin.id}" 已存在，将覆盖旧版本。`);
    }
    this.plugins.set(plugin.id, { ...plugin });
  }

  /**
   * 注销一个插件
   */
  unregister(id: string): void {
    if (!this.plugins.has(id)) {
      console.warn(`[PluginRegistry] 插件 "${id}" 未注册，无法注销。`);
      return;
    }
    this.plugins.delete(id);
  }

  /**
   * 根据 ID 获取插件
   */
  get(id: string): XOnePlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * 获取所有已注册的插件
   */
  getAll(): XOnePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取指定模式下的已注册插件
   * 包含该模式专属插件和 both 模式插件
   */
  getByMode(mode: 'personal' | 'work'): XOnePlugin[] {
    return this.getAll().filter(
      (plugin) => plugin.mode === mode || plugin.mode === 'both'
    );
  }

  /**
   * 获取指定模式下的所有菜单项
   * 按 order 升序排列
   */
  getMenuItems(mode: 'personal' | 'work'): PluginMenuItem[] {
    const plugins = this.getByMode(mode);
    return plugins
      .flatMap((plugin) => plugin.menuItems)
      .sort((a, b) => a.order - b.order);
  }

  /**
   * 判断插件是否已注册
   */
  has(id: string): boolean {
    return this.plugins.has(id);
  }

  /**
   * 清空所有注册（主要用于测试）
   */
  clear(): void {
    this.plugins.clear();
  }
}

/** 全局插件注册表单例 */
export const pluginRegistry = new PluginRegistry();
