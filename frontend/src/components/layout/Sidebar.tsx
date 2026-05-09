'use client'

import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { BrandHeader } from './BrandHeader'
import { SidebarGroup, type SidebarGroupProps } from './SidebarGroup'
import { SidebarMenuItem } from './SidebarMenuItem'
import { ModeSwitch } from './ModeSwitch'
import { ThemeToggle } from './ThemeToggle'
import { LocaleSwitcher } from './LocaleSwitcher'
import { TooltipProvider } from '@/components/ui/tooltip'

interface SidebarProps {
  groups: SidebarGroupProps[]
  locale: string
  /** 是否为移动端 */
  isMobile?: boolean
  /** 移动端覆盖层是否打开 */
  mobileOpen?: boolean
  /** 移动端关闭回调 */
  onMobileClose?: () => void
}

/**
 * XOne 主侧边栏
 *
 * - 展开宽度 240px，折叠宽度 64px
 * - 从 sidebar-store 读取 isCollapsed 状态
 * - 底部固定"设置"入口
 * - groups 内容由上层页面根据 mode-store 的 mode 动态提供
 * - 移动端：overlay 模式，从左侧滑入，带半透明 backdrop
 */
export function Sidebar({ groups, locale, isMobile = false, mobileOpen = false, onMobileClose }: SidebarProps) {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)

  // 移动端时 sidebar 完全隐藏或作为 overlay 滑入
  // 桌面端时保持原有折叠/展开行为
  const sidebarContent = (
    <aside
      aria-label="主导航侧边栏"
      className={cn(
        'flex flex-col',
        'bg-bg-sidebar border-r border-border',
        'transition-[width,transform] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        isMobile
          ? [
              'fixed inset-y-0 left-0 z-40 w-[240px]',
              'shadow-xl',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            ]
          : [
              'fixed inset-y-0 left-0 z-30',
            ]
      )}
      style={isMobile ? undefined : { width: isCollapsed ? 64 : 240 }}
    >
      {/* Logo / Brand */}
      <BrandHeader collapsed={isMobile ? false : isCollapsed} />

      {/* Scrollable menu area */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2">
        {groups.map((group) => (
          <SidebarGroup
            key={group.title}
            title={group.title}
            icon={group.icon}
            items={group.items}
            collapsed={isMobile ? false : isCollapsed}
            onItemClick={isMobile ? onMobileClose : undefined}
          />
        ))}
      </nav>

      {/* Fixed bottom area */}
      <div className="border-t border-border">
        {/* 模式切换按钮 */}
        <div className="p-2">
          <ModeSwitch />
        </div>

        {/* 工具控制组：主题 + 语言 */}
        <div className={cn(
          'border-t border-border px-2 py-1',
          (isMobile ? false : isCollapsed) ? 'flex flex-col items-center gap-0.5' : 'flex flex-col gap-0.5'
        )}>
          <ThemeToggle collapsed={isMobile ? false : isCollapsed} />
          <LocaleSwitcher locale={locale} collapsed={isMobile ? false : isCollapsed} />
        </div>

        {/* 设置入口 */}
        <div className="border-t border-border p-2">
          <SidebarMenuItem
            icon={Settings}
            label="设置"
            collapsed={isMobile ? false : isCollapsed}
            index={0}
          />
        </div>
      </div>
    </aside>
  )

  return (
    <TooltipProvider delayDuration={300}>
      {/* 移动端 backdrop overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}
      {sidebarContent}
    </TooltipProvider>
  )
}
