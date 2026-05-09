'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { SearchX, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLocaleFromPathname } from '@/lib/utils/locale'

/**
 * 404 Not Found page for the [locale] route segment.
 *
 * Rendered automatically by Next.js when a page within this
 * segment is not found. Renders inside the locale layout
 * (which provides NextIntlClientProvider), so useTranslations()
 * is always available.
 */
export default function LocaleNotFoundPage() {
  const t = useTranslations()
  const router = useRouter()

  const handleGoHome = useCallback(() => {
    const locale = getLocaleFromPathname()
    router.push(`/${locale}/personal/dashboard`)
  }, [router])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        {/* 404 Code */}
        <span className="text-8xl font-black text-muted-foreground/25 select-none">
          404
        </span>

        {/* Icon */}
        <div className="rounded-full bg-muted p-4">
          <SearchX className="size-12 text-muted-foreground" aria-hidden="true" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('errors.notFound.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('errors.notFound.description')}
          </p>
        </div>

        {/* Action */}
        <Button onClick={handleGoHome} size="lg">
          <Home className="mr-2 size-4" aria-hidden="true" />
          {t('errors.goHome')}
        </Button>
      </div>
    </div>
  )
}
