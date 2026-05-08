// XOne 插件类型定义
// 定义插件系统中使用的所有核心类型

export type PluginMode = 'personal' | 'work' | 'both';

/**
 * 插件菜单项
 * 每个菜单项对应插件的一个独立页面/入口
 */
export interface PluginMenuItem {
  /** 菜单项唯一标识 */
  id: string;
  /** 国际化 key（对应 i18n 翻译文件中的 key） */
  labelKey: string;
  /** lucide-react 图标名称（如 "Settings", "HelpCircle"） */
  icon: string;
  /** 路由路径（如 "/personal/health"） */
  path: string;
  /** 排序权重，数字越小越靠前 */
  order: number;
}

/**
 * XOne 插件接口
 * 每个插件必须实现此接口
 */
export interface XOnePlugin {
  /** 插件唯一标识，推荐使用命名空间格式，如 "personal.health" */
  id: string;
  /** 显示名称国际化 key */
  nameKey: string;
  /** 插件图标（lucide-react 图标名称） */
  icon: string;
  /** 所属模式：personal | work | both */
  mode: PluginMode;
  /** 语义化版本号 */
  version: string;
  /** 菜单项列表（一个插件可以有多个页面入口） */
  menuItems: PluginMenuItem[];
  /** 插件描述（可选） */
  description?: string;
  /** 依赖的其他插件 ID 列表（可选） */
  dependencies?: string[];
  /** 是否默认启用（默认 false） */
  defaultEnabled?: boolean;
}
