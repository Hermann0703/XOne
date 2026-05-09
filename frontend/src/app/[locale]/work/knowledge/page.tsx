'use client'
import { useTranslations } from 'next-intl'
import DocumentList from '@/plugins/builtin/work/knowledge/DocumentList'
import { PageHeader } from '@/components/shared'

export default function KnowledgePage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader title={t('knowledge.title')} description="管理文档与向量检索" />
      <DocumentList />
    </>
  )
}
