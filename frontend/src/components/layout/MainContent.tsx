'use client'

import { cn } from '@/lib/utils'
import { useTabStore } from '@/lib/store/tab-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'

/**
 * XOne 主内容区
 *
 * - margin-left 随侧边栏展开/折叠同步过渡
 * - 移动端 marginLeft: 0（无左侧偏移）
 * - 顶部为标签栏高度 (40px) 留出空间
 * - 根据 activeTabId 渲染对应内容
 */
export function MainContent({
  children,
  className,
  isMobile = false,
}: {
  children?: React.ReactNode
  className?: string
  isMobile?: boolean
}) {
  const activeTabId = useTabStore((s) => s.activeTabId)
  const tabs = useTabStore((s) => s.tabs)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)

  const activeTab = tabs.find((tab) => tab.id === activeTabId)

  return (
    <main
      className={cn(
        'pt-10 p-6 min-h-screen',
        'transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        className
      )}
      style={{ marginLeft: isMobile ? 0 : isCollapsed ? 64 : 240 }}
    >
      {children ?? (
        <div className="text-muted-foreground text-sm">
          {activeTab ? (
            <p>Active tab: {activeTab.labelKey} ({activeTab.path})</p>
          ) : (
            <p>No active tab</p>
          )}
        </div>
      )}
    </main>
  )
}
