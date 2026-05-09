'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LocaleSwitcherProps {
  locale: string
  collapsed?: boolean
}

const LOCALE_LABELS: Record<string, string> = {
  zh: '中文',
  en: 'English',
}

const NEXT_LOCALE: Record<string, string> = {
  zh: 'en',
  en: 'zh',
}

export function LocaleSwitcher({ locale, collapsed = false }: LocaleSwitcherProps) {
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = () => {
    const next = NEXT_LOCALE[locale] || 'zh'
    // Replace [locale] segment: e.g. /zh/personal/dashboard → /en/personal/dashboard
    const newPath = pathname.replace(`/${locale}`, `/${next}`)
    router.push(newPath)
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      title={`切换到 ${LOCALE_LABELS[NEXT_LOCALE[locale]] || 'English'}`}
      className={cn(
        'flex items-center rounded-btn transition-colors duration-150',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        collapsed ? 'justify-center w-full p-2' : 'w-full gap-2 px-3 py-2'
      )}
    >
      <Globe className="h-4 w-4 shrink-0" strokeWidth={1.5} />
      {!collapsed && (
        <span className="text-xs font-medium">
          {LOCALE_LABELS[locale] || locale.toUpperCase()}
        </span>
      )}
    </button>
  )
}
