'use client'

import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Film,
  Heart,
  TrendingUp,
  MoreHorizontal,
  Briefcase,
  Activity,
  FolderOpen,
  FileText,
  Package,
  Settings2,
  User,
  HardDrive,
  Search,
  Bell,
} from 'lucide-react'
import type { SidebarGroupProps } from './SidebarGroup'
import type { SidebarMenuItemProps } from './SidebarMenuItem'

// ---------------------------------------------------------------------------
// 菜单项配置类型（不含 collapsed / index，由 Sidebar 运行时注入）
// ---------------------------------------------------------------------------
export interface SidebarMenuConfigItem
  extends Omit<SidebarMenuItemProps, 'collapsed' | 'index'> {}

export interface SidebarGroupConfig {
  title: string
  icon: SidebarMenuItemProps['icon']
  items: SidebarMenuConfigItem[]
}

// ---------------------------------------------------------------------------
// 个人模式菜单配置
// ---------------------------------------------------------------------------
const personalGroups: SidebarGroupConfig[] = [
  {
    title: '个人空间',
    icon: User,
    items: [
      {
        id: 'personal.dashboard',
        icon: LayoutDashboard,
        label: '仪表盘',
        path: '/personal/dashboard',
      },
      {
        id: 'personal.shopping',
        icon: ShoppingCart,
        label: '购物清单',
        path: '/personal/shopping',
      },
      {
        id: 'personal.reading',
        icon: BookOpen,
        label: '藏书阁',
        path: '/personal/reading',
      },
      {
        id: 'personal.media',
        icon: Film,
        label: '影音馆',
        path: '/personal/media',
      },
      {
        id: 'personal.health',
        icon: Heart,
        label: '健康管理',
        path: '/personal/health',
      },
    ],
  },
  {
    title: '更多',
    icon: MoreHorizontal,
    items: [
      {
        id: 'personal.assets',
        icon: TrendingUp,
        label: '资产管理',
        path: '/personal/assets',
      },
      {
        id: 'personal.notifications',
        icon: Bell,
        label: '通知中心',
        path: '/personal/notifications',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// 工作模式菜单配置
// ---------------------------------------------------------------------------
const workGroups: SidebarGroupConfig[] = [
  {
    title: '工作空间',
    icon: Briefcase,
    items: [
      {
        id: 'work.dashboard',
        icon: Activity,
        label: '仪表盘',
        path: '/work/dashboard',
      },
      {
        id: 'work.project',
        icon: FolderOpen,
        label: '项目管理',
        path: '/work/project',
      },
      {
        id: 'work.knowledge',
        icon: BookOpen,
        label: '知识库',
        path: '/work/knowledge',
      },
      {
        id: 'work.contracts',
        icon: FileText,
        label: '合同管理',
        path: '/work/contracts',
      },
      {
        id: 'work.archives',
        icon: Package,
        label: '档案管理',
        path: '/work/archives',
      },
    ],
  },
  {
    title: '系统',
    icon: Settings2,
    items: [
      {
        id: 'work.dispatch',
        icon: Activity,
        label: '调度中心',
        path: '/work/dispatch',
      },
      {
        id: 'work.storage',
        icon: HardDrive,
        label: '存储管理',
        path: '/work/storage',
      },
      {
        id: 'work.search',
        icon: Search,
        label: '全局搜索',
        path: '/work/search',
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// 辅助函数：根据模式获取菜单分组
// collapsed 占位为 false，运行时由 Sidebar 组件注入实际值
// ---------------------------------------------------------------------------
export function getSidebarGroups(mode: 'personal' | 'work'): SidebarGroupProps[] {
  const configs = mode === 'personal' ? personalGroups : workGroups
  return configs.map((group) => ({
    ...group,
    collapsed: false, // 占位值，由 Sidebar 渲染时覆盖
    items: group.items.map((item) => ({
      ...item,
      collapsed: false, // 占位值，由 SidebarGroup 渲染时覆盖
    })),
  })) as SidebarGroupProps[]
}
