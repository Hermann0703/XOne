'use client'
import { useTranslations } from 'next-intl'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/shared'
import { Skeleton } from '@/components/ui/skeleton'

const SearchDashboard = dynamic(() => import('@/plugins/builtin/work/search').then(m => m.SearchDashboard), {
  loading: () => (
    <div className="space-y-6 p-6">
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-lg" />
        <Skeleton className="h-12 w-24 rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  ),
})

export default function SearchPage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader
        title={t('search.title')}
        description={t('search.description')}
      />
      <SearchDashboard />
    </>
  )
}
