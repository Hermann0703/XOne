'use client'

import Link from 'next/link'
import { useLocale } from 'next-intl'
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
  /** 路由路径，提供后内部使用 next/link 实现导航跳转 */
  path?: string
  /** 移动端点击菜单项后关闭侧边栏的回调 */
  onItemClick?: () => void
}

export function SidebarMenuItem({
  icon: Icon,
  label,
  active = false,
  collapsed,
  onClick,
  badge,
  index = 0,
  path,
  onItemClick,
}: SidebarMenuItemProps) {
  const locale = useLocale()
  // 点击 handler：优先使用 path (Link 模式)，回退到 onClick
  // Link 模式下不需要 button 元素，避免嵌套交互元素
  const handleClick = path ? undefined : onClick
  // 合并点击回调（用于移动端关闭 sidebar）
  const handleCombinedClick = () => {
    onItemClick?.()
    onClick?.()
  }

  // 共享的样式类名
  const itemClassName = cn(
    'group relative flex items-center w-full gap-3 rounded-btn transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    collapsed ? 'justify-center px-0 py-2.5' : 'justify-start px-3 py-2',
    active
      ? 'text-foreground font-semibold'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
  )

  // 激活态背景色
  const activeStyle = active
    ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }
    : undefined

  // 共享的内容（图标 + 文本 + badge）
  const content = (
    <>
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
    </>
  )

  // 根据是否有 path 决定使用 Link 还是 button
  // Link 模式：使用 next/link 包裹，内部使用 span（非交互元素）
  // Button 模式：使用 button + onClick
  const itemContent = path ? (
    <Link
      href={`/${locale}${path}`}
      className={itemClassName}
      style={activeStyle}
      onClick={onItemClick}
    >
      {content}
    </Link>
  ) : (
    <button
      type="button"
      onClick={handleCombinedClick}
      className={itemClassName}
      style={activeStyle}
    >
      {content}
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
