'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'

const ClassificationList = dynamic(() => import('@/plugins/builtin/work/contracts').then(m => m.ClassificationList), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

export default function ClassificationsPage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader title={t('contracts.classifications.title')} />
      <ClassificationList />
    </>
  )
}
