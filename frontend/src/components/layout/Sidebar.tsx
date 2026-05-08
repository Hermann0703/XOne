'use client'

import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { BrandHeader } from './BrandHeader'
import { SidebarGroup, type SidebarGroupProps } from './SidebarGroup'
import { SidebarMenuItem } from './SidebarMenuItem'
import { TooltipProvider } from '@/components/ui/tooltip'

interface SidebarProps {
  groups: SidebarGroupProps[]
}

/**
 * XOne 主侧边栏
 *
 * - 展开宽度 240px，折叠宽度 64px
 * - 从 sidebar-store 读取 isCollapsed 状态
 * - 底部固定"设置"入口
 * - groups 内容由上层页面根据 mode-store 的 mode 动态提供
 */
export function Sidebar({ groups }: SidebarProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label="主导航侧边栏"
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex flex-col',
          'bg-bg-sidebar border-r border-border',
          'transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]'
        )}
        style={{ width: isCollapsed ? 64 : 240 }}
      >
        {/* Logo / Brand */}
        <BrandHeader collapsed={isCollapsed} />

        {/* Scrollable menu area */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
          {groups.map((group) => (
            <SidebarGroup
              key={group.title}
              title={group.title}
              icon={group.icon}
              items={group.items}
              collapsed={isCollapsed}
            />
          ))}
        </nav>

        {/* Fixed bottom: Settings */}
        <div className="border-t border-border p-2">
          <SidebarMenuItem
            icon={Settings}
            label="设置"
            collapsed={isCollapsed}
            index={0}
          />
        </div>
      </aside>
    </TooltipProvider>
  )
}
