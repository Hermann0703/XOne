'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'

const LookupDictList = dynamic(() => import('@/plugins/builtin/work/contracts').then(m => m.LookupDictList), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

export default function LookupDictPage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader title={t('contracts.lookup.title')} />
      <LookupDictList />
    </>
  )
}
