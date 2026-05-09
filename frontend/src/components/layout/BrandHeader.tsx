'use client'

import { Layers, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebarStore } from '@/lib/store/sidebar-store'

interface BrandHeaderProps {
  collapsed: boolean
}

export function BrandHeader({ collapsed }: BrandHeaderProps) {
  const toggle = useSidebarStore((s) => s.toggle)

  return (
    <div
      className={cn(
        'flex items-center h-14 border-b border-border overflow-hidden',
        collapsed ? 'justify-center px-0' : 'justify-start px-4'
      )}
    >
      {collapsed ? (
        /* 折叠状态：居中显示 PanelLeftOpen 展开按钮 */
        <button
          type="button"
          aria-label="展开侧边栏"
          onClick={toggle}
          className="flex items-center justify-center w-10 h-10 rounded-btn text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <PanelLeftOpen className="h-5 w-5" strokeWidth={1.5} />
        </button>
      ) : (
        <>
          {/* 展开状态：品牌标识在左，折叠按钮在右 */}
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
            <span className="text-lg font-bold text-foreground whitespace-nowrap select-none">
              XOne
            </span>
          </div>

          {/* 折叠按钮 */}
          <button
            type="button"
            aria-label="折叠侧边栏"
            onClick={toggle}
            className="ml-auto flex items-center justify-center w-10 h-10 rounded-btn text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <PanelLeftClose className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>
  )
}
