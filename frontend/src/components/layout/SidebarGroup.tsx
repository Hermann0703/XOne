'use client'

import { usePathname } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarMenuItem, type SidebarMenuItemProps } from './SidebarMenuItem'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface SidebarGroupProps {
  title: string
  icon: LucideIcon
  items: SidebarMenuItemProps[]
  collapsed: boolean
  /** 移动端点击菜单项后关闭侧边栏的回调 */
  onItemClick?: () => void
}

export function SidebarGroup({
  title,
  icon: Icon,
  items,
  collapsed,
  onItemClick,
}: SidebarGroupProps) {
  // 当前路由路径（去除 locale 前缀），用于判断哪个菜单项处于激活态
  const fullPathname = usePathname()
  const pathname = fullPathname.replace(/^\/[a-z]{2}/, '') || '/'

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-0.5 py-2">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-10 h-10 rounded-btn text-muted-foreground">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            {title}
          </TooltipContent>
        </Tooltip>

        <ul className="flex flex-col items-center gap-0.5 w-full" role="menubar">
          {items.map((item, i) => {
            // 菜单项高亮：当前路由以菜单项的 path 开头时激活
            const isActive = item.path
              ? pathname.startsWith(item.path)
              : item.active

            return (
              <li key={item.id} role="none">
                <SidebarMenuItem
                  {...item}
                  active={isActive}
                  collapsed={collapsed}
                  index={i}
                  onItemClick={onItemClick}
                />
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {/* Group title */}
      <div className="px-3 py-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold select-none">
          {title}
        </span>
      </div>

      {/* Group icon + items */}
      <ul className="flex flex-col gap-0.5" role="menu">
        {items.map((item, i) => {
          // 菜单项高亮：当前路由以菜单项的 path 开头时激活
          const isActive = item.path
            ? pathname.startsWith(item.path)
            : item.active

          return (
            <li key={item.id} role="none">
              <SidebarMenuItem
                {...item}
                active={isActive}
                collapsed={collapsed}
                index={i}
                onItemClick={onItemClick}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
