'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { type LucideIcon, ChevronRight, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SidebarMenuItem, type SidebarMenuItemProps } from './SidebarMenuItem'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface SidebarExpandableItemProps {
  icon: LucideIcon
  label: string
  /** 子菜单项数据 */
  items: SidebarMenuItemProps[]
  /** 全局侧边栏是否折叠 */
  collapsed: boolean
  /** Stagger index */
  index?: number
  /** 移动端点击后关闭侧边栏 */
  onItemClick?: () => void
}

export function SidebarExpandableItem({
  icon: Icon,
  label,
  items: childItems,
  collapsed,
  index = 0,
  onItemClick,
}: SidebarExpandableItemProps) {
  const fullPathname = usePathname()
  const pathname = fullPathname.replace(/^\/[a-z]{2}/, '') || '/'

  // 提取子项的 path 数组，用于判断激活态
  const childPaths = childItems.map((c) => c.path).filter(Boolean) as string[]

  // 判断是否有子路由匹配当前路径 → 自动展开
  const hasActiveChild = childPaths.some((p) => pathname.startsWith(p))
  const [expanded, setExpanded] = useState(hasActiveChild)

  // 无 children 时退化为普通 SidebarMenuItem
  if (childItems.length === 0) {
    return (
      <SidebarMenuItem
        icon={Icon}
        label={label}
        collapsed={collapsed}
        index={index}
        onItemClick={onItemClick}
      />
    )
  }

  // 激活态：任一子项路径匹配当前路由
  const isActive = hasActiveChild

  const toggle = () => setExpanded((prev) => !prev)

  // ---------- 折叠模式：仅显示父项图标 ----------
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
            suppressHydrationWarning
          >
            <button
              type="button"
              className={cn(
                'group relative flex items-center justify-center w-full gap-3 rounded-btn transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                'px-0 py-2.5',
                isActive
                  ? 'text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
              style={
                isActive
                  ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
                  : undefined
              }
              aria-label={label}
              aria-expanded={expanded}
              onClick={toggle}
            >
              <span suppressHydrationWarning>
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              </span>
            </button>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={12}>
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  // ---------- 展开模式：父项 + 可折叠子项 ----------
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05,
        ease: 'easeOut',
      }}
      suppressHydrationWarning
    >
      {/* 父项按钮 */}
      <button
        type="button"
        className={cn(
          'group relative flex items-center w-full gap-3 rounded-btn transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'justify-start px-3 py-2',
          isActive
            ? 'text-foreground font-semibold'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
        style={
          isActive
            ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
            : undefined
        }
        aria-expanded={expanded}
        onClick={toggle}
      >
        <span suppressHydrationWarning>
          <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
        </span>
        <span className="text-sm font-medium truncate flex-1 text-left">{label}</span>
        <span className="shrink-0 ml-auto">
          {expanded ? (
            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          )}
        </span>
      </button>

      {/* 可折叠子项列表 */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden ml-4 border-l border-border/60 pl-2 mt-0.5 flex flex-col gap-0.5"
            role="menu"
          >
            {childItems.map((child, ci) => {
              const childActive = child.path
                ? pathname.startsWith(child.path)
                : child.active

              return (
                <li key={child.id ?? ci} role="none">
                  <SidebarMenuItem
                    {...child}
                    active={childActive}
                    collapsed={false}
                    index={ci}
                    onItemClick={onItemClick}
                  />
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
