'use client'

import { type LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface SidebarMenuItemProps {
  id?: string
  icon: LucideIcon
  label: string
  active?: boolean
  collapsed: boolean
  onClick?: () => void
  badge?: number
  /** Stagger index for animation delay */
  index?: number
}

export function SidebarMenuItem({
  icon: Icon,
  label,
  active = false,
  collapsed,
  onClick,
  badge,
  index = 0,
}: SidebarMenuItemProps) {
  const itemContent = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex items-center w-full gap-3 rounded-btn transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
      style={
        active
          ? {
              backgroundColor:
                'color-mix(in srgb, var(--color-primary) 10%, transparent)',
            }
          : undefined
      }
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />

      {!collapsed && (
        <>
          <span className="text-sm font-medium truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                'ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5',
                'rounded-full text-[11px] font-semibold leading-none',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </>
      )}
    </button>
  )

  if (collapsed) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.2,
              delay: index * 0.05,
              ease: 'easeOut',
            }}
          >
            {itemContent}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05,
        ease: 'easeOut',
      }}
    >
      {itemContent}
    </motion.div>
  )
}
