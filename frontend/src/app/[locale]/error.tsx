'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLocaleFromPathname } from '@/lib/utils/locale'

/**
 * Next.js App Router error boundary for the [locale] segment.
 *
 * Renders inside the locale layout (which provides NextIntlClientProvider),
 * so useTranslations() is always available.
 */
export default function LocaleErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations()
  const router = useRouter()
  const isDev = process.env.NODE_ENV === 'development'

  // Log the error for debugging / monitoring
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  const handleGoHome = useCallback(() => {
    const locale = getLocaleFromPathname()
    router.push(`/${locale}/personal/dashboard`)
  }, [router])

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        {/* Icon */}
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertTriangle className="size-12 text-destructive" aria-hidden="true" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t('errors.unexpected')}
          </h1>
          {isDev && (
            <p className="text-sm text-muted-foreground break-all font-mono px-2">
              {error.message || 'Unknown error'}
            </p>
          )}
          {isDev && error.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              Digest: {error.digest}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={reset} variant="outline">
            <RotateCcw className="mr-2 size-4" aria-hidden="true" />
            {t('errors.retry')}
          </Button>
          <Button onClick={handleGoHome}>
            <Home className="mr-2 size-4" aria-hidden="true" />
            {t('errors.goHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
