'use client'

import { useCallback } from 'react'
import { X, Menu, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { useTabStore } from '@/lib/store/tab-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useModeStore } from '@/stores/mode-store'

interface TabBarProps {
  /** 移动端 hamburger 点击回调 */
  onMenuClick?: () => void
  /** 是否移动端 */
  isMobile?: boolean
}

/**
 * XOne 顶部标签栏
 *
 * - 固定顶部，高度 40px，z-20
 * - 左偏移随侧边栏展开/折叠同步过渡
 * - 左侧面包屑：当前模式 → 当前页面标题
 * - 移动端左侧显示 hamburger 按钮
 * - 标签水平排列，激活态有底部高亮条
 * - 每个标签右侧有关闭按钮
 * - 键盘导航：ArrowLeft/ArrowRight 切换标签，Home/End 跳转首尾
 * - Roving tabindex: 仅激活标签可 Tab 聚焦（tabIndex=0），其余 tabIndex=-1
 *
 * WAI-ARIA 标签页模式参考：
 * - role="tablist" 包含所有 role="tab" 按钮
 * - aria-selected 标记激活态
 * - data-value 用于键盘导航中的 DOM 查询
 */
export function TabBar({ onMenuClick, isMobile = false }: TabBarProps) {
  const t = useTranslations()
  const tabs = useTabStore((s) => s.tabs)
  const activeTabId = useTabStore((s) => s.activeTabId)
  const closeTab = useTabStore((s) => s.closeTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const mode = useModeStore((s) => s.mode)

  // 面包屑数据
  const activeTab = tabs.find((tab) => tab.id === activeTabId)
  const modeLabel = mode === 'personal' ? t('nav.personal') : t('nav.work')
  const pageTitle = activeTab ? t(activeTab.labelKey) : t('app.name')

  // ============================================================
  // 键盘导航 — ArrowLeft/ArrowRight/Home/End
  // 使用 querySelector 动态查找所有 tab 按钮（避免 ref 管理）
  // ============================================================
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tablist = e.currentTarget
      // 获取所有带 data-value 属性的 tab 按钮
      const triggers = tablist.querySelectorAll<HTMLButtonElement>(
        '[role="tab"][data-value]'
      )
      if (triggers.length === 0) return

      const values = Array.from(triggers)
      const currentIndex = values.findIndex(
        (el) => el === document.activeElement
      )
      if (currentIndex === -1) return

      let nextIndex: number | undefined

      switch (e.key) {
        case 'ArrowRight':
          // 下一个 tab，循环
          nextIndex = (currentIndex + 1) % values.length
          break
        case 'ArrowLeft':
          // 上一个 tab，循环
          nextIndex = (currentIndex - 1 + values.length) % values.length
          break
        case 'Home':
          // 跳转到第一个 tab
          nextIndex = 0
          break
        case 'End':
          // 跳转到最后一个 tab
          nextIndex = values.length - 1
          break
        default:
          return // 不阻止其他按键的默认行为
      }

      e.preventDefault()
      const nextTrigger = values[nextIndex!]
      nextTrigger.focus()
      // 通过 data-value 激活对应 tab
      const nextValue = nextTrigger.getAttribute('data-value')
      if (nextValue) {
        setActiveTab(nextValue)
      }
    },
    [setActiveTab]
  )

  return (
    <div
      className={cn(
        'fixed top-0 z-20 flex h-10 items-end border-b border-border bg-background',
        'overflow-x-auto',
        'transition-[margin-left] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]'
      )}
      style={{ left: isMobile ? 0 : isCollapsed ? 64 : 240, right: 0 }}
    >
      {/* 面包屑区域 + 移动端 hamburger */}
      <div className="flex items-center h-full shrink-0 pl-2 pr-3 gap-1">
        {/* 移动端 hamburger 按钮 */}
        {isMobile && (
          <button
            type="button"
            aria-label="打开菜单"
            onClick={onMenuClick}
            className="flex items-center justify-center w-8 h-8 rounded-btn text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}

        {/* 面包屑：仅展开或折叠时显示页面标题 */}
        <nav aria-label="面包屑导航" className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap select-none">
          {!isCollapsed && (
            <>
              <span className="font-medium">{modeLabel}</span>
              <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            </>
          )}
          <span className="text-foreground font-medium">{pageTitle}</span>
        </nav>
      </div>

      {/* 分隔线 */}
      <Separator orientation="vertical" className="h-5 self-center" />

      {/* 标签列表 — role="tablist" 容器，统一管理键盘导航 */}
      <div
        role="tablist"
        aria-label="标签页"
        aria-orientation="horizontal"
        className="flex h-full items-end"
        onKeyDown={handleTabKeyDown}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.id === activeTabId
          return (
            <div key={tab.id} className="group flex h-full items-end">
              {idx > 0 && (
                <Separator orientation="vertical" className="h-5 self-center" />
              )}
              {/* 单个 tab 按钮 — roving tabindex: 选中=0, 未选中=-1 */}
              <button
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                data-value={tab.id}
                className={cn(
                  'relative flex h-full items-center px-3 text-sm font-medium cursor-pointer select-none whitespace-nowrap transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isActive
                    ? 'bg-background border-b-2 border-primary text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{t(tab.labelKey)}</span>
              </button>

              {/* 关闭按钮 — 位于 tablist 内部但非 role="tab"，键盘导航自动跳过 */}
              <button
                type="button"
                aria-label={`关闭 ${t(tab.labelKey)}`}
                className={cn(
                  'ml-0.5 flex h-4 w-4 items-center justify-center rounded-sm',
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  'hover:bg-destructive/10 hover:text-destructive',
                  'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
          )
        })}
      </div>
    </div>
  )
}
