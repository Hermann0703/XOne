'use client'

import { useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/lib/store/theme-store'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore()

  // Hydrate: ensure store matches DOM after mount
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' | null
    if (current && current !== theme) {
      useThemeStore.setState({ theme: current })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      className={cn(
        'flex items-center rounded-btn transition-colors duration-150',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        collapsed ? 'justify-center w-full p-2' : 'w-full gap-2 px-3 py-2'
      )}
    >
      {theme === 'light' ? (
        <Moon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      ) : (
        <Sun className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      )}
      {!collapsed && (
        <span className="text-xs font-medium">
          {theme === 'light' ? '深色模式' : '浅色模式'}
        </span>
      )}
    </button>
  )
}
