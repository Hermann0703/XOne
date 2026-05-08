'use client'

import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BrandHeaderProps {
  collapsed: boolean
}

export function BrandHeader({ collapsed }: BrandHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center h-14 border-b border-border overflow-hidden',
        collapsed ? 'justify-center px-0' : 'justify-start px-4 gap-3'
      )}
    >
      <Layers className="h-6 w-6 text-primary shrink-0" strokeWidth={1.5} />
      {!collapsed && (
        <span className="text-lg font-bold text-foreground whitespace-nowrap select-none">
          XOne
        </span>
      )}
    </div>
  )
}
