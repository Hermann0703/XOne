'use client'

import { useTranslations } from 'next-intl'
import ContractLifecycleManager from '@/plugins/builtin/work/contracts/ContractLifecycleManager'
import { PageHeader } from '@/components/shared'

export default function LifecyclePage() {
  const t = useTranslations('work.contracts')
  return (
    <>
      <PageHeader title={t('lifecycle.title') || '生命周期管理'} />
      <ContractLifecycleManager />
    </>
  )
}
