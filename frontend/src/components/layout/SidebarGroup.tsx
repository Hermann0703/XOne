'use client'

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
}

export function SidebarGroup({
  title,
  icon: Icon,
  items,
  collapsed,
}: SidebarGroupProps) {
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

        <div className="flex flex-col items-center gap-0.5 w-full">
          {items.map((item, i) => (
            <SidebarMenuItem
              key={item.id}
              {...item}
              collapsed={collapsed}
              index={i}
            />
          ))}
        </div>
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
      <div className="flex flex-col gap-0.5">
        {items.map((item, i) => (
          <SidebarMenuItem
            key={item.id}
            {...item}
            collapsed={collapsed}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
