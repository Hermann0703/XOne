'use client'
import { useTranslations } from 'next-intl'
import ArchiveList from '@/plugins/builtin/work/archives/ArchiveList'
import { PageHeader } from '@/components/shared'

export default function ArchivesPage() {
  const t = useTranslations()
  return (
    <div className="container mx-auto space-y-6">
      <PageHeader title={t('archives.title')} />
      <ArchiveList />
    </div>
  )
}
