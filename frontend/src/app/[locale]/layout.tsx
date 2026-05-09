import { getMessages } from 'next-intl/server'
import { AppShell } from '@/components/layout/AppShell'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const [messages, { locale }] = await Promise.all([getMessages(), params])

  return <AppShell locale={locale} messages={messages}>{children}</AppShell>
}
