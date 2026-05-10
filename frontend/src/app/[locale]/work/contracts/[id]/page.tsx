import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const ContractDetail = dynamic(() => import('@/plugins/builtin/work/contracts/ContractDetail'), {
  loading: () => (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  ),
})

export default function ContractDetailPage() {
  return <ContractDetail />
}
