import { getMessages } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'

export default async function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const messages = await getMessages()

  return (
    <NextIntlClientProvider locale="zh" messages={messages} timeZone="Asia/Shanghai">
      {children}
    </NextIntlClientProvider>
  )
}
