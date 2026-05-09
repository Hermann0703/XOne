'use client'
import { useTranslations } from 'next-intl'
import DataSourceList from '@/plugins/builtin/work/dispatch/DataSourceList'
import { PageHeader } from '@/components/shared'

export default function DispatchPage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader title={t('dispatch.title')} />
      <DataSourceList />
    </>
  )
}
