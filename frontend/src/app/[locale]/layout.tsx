import { getMessages, getTranslations } from 'next-intl/server'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const [messages, { locale }] = await Promise.all([getMessages(), params])
  const t = await getTranslations()

  const SKIP_LINK_CLASSES =
    'sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <>
      <a href="#main-content" className={SKIP_LINK_CLASSES}>
        {t('common.skipToContent')}
      </a>
      <AppShell locale={locale} messages={messages}>{children}</AppShell>
      <Toaster />
    </>
  )
}
