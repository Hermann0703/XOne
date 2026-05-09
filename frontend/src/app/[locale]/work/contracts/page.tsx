'use client'
import { useTranslations } from 'next-intl'
import ContractList from '@/plugins/builtin/work/contracts/ContractList'
import { PageHeader } from '@/components/shared'

export default function ContractsPage() {
  const t = useTranslations()
  return (
    <>
      <PageHeader title={t('contracts.title')} />
      <ContractList />
    </>
  )
}
