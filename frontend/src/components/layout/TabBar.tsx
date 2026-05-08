'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { useTabStore } from '@/lib/store/tab-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'

/**
 * XOne 顶部标签栏
 *
 * - 固定顶部，高度 40px，z-20
 * - 左偏移随侧边栏展开/折叠同步过渡
 * - 标签水平排列，激活态有底部高亮条
 * - 每个标签右侧有关闭按钮
 */
export function TabBar() {
  const t = useTranslations()
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const openTab = useTabStore((s) => s.openTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)

  return (
    <div
      className={cn(
        'fixed top-0 z-20 flex h-10 items-end border-b border-border bg-background',
        'overflow-x-auto',
        'transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]'
      )}
      style={{ left: isCollapsed ? 64 : 240, right: 0 }}
    >
      {/* 标签列表 - 用内层 div 实现可滚动 */}
      <div className="flex h-full items-end">
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId
          return (
            <div key={tab.id} className="flex h-full items-end">
              {idx > 0 && (
                <Separator orientation="vertical" className="h-5 self-center" />
              )}
              <div
                role="tab"
                aria-selected={isActive}
                className={cn(
                  'group relative flex h-full items-center gap-1 px-3 text-sm font-medium cursor-pointer select-none whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-background border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{t(tab.labelKey)}</span>

                {/* 关闭按钮 */}
                <button
                  type="button"
                  aria-label={`Close ${t(tab.labelKey)}`}
                  className={cn(
                    'ml-0.5 flex h-4 w-4 items-center justify-center rounded-sm',
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    'hover:bg-destructive/10 hover:text-destructive',
                    isActive && 'opacity-100'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
