'use client'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/shared'
import { Skeleton } from '@/components/ui/skeleton'

const StorageDashboard = dynamic(() => import('@/plugins/builtin/work/storage/Dashboard'), {
  loading: () => (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  ),
})

export default function StoragePage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader title={t('storage.title')} />
      <StorageDashboard />
    </>
  )
}
