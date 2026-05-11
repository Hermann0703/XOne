'use client'

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/shared'

const ContractForm = dynamic(() => import('@/plugins/builtin/work/contracts/ContractForm'), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

export default function EditContractPage() {
  const t = useTranslations()

  return (
    <>
      <PageHeader title={t('contracts.detail')} />
      <nav className="px-6 pt-2" aria-label="breadcrumb">
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary">
          <Link href="/work/contracts" className="hover:text-text-primary transition-colors">
            {t('contracts.title')}
          </Link>
          <ChevronRight className="size-3.5" />
          <span>{t('contracts.detail')}</span>
        </span>
      </nav>
      <ContractForm />
    </>
  )
}
