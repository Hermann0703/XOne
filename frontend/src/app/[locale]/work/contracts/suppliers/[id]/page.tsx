import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

const SupplierDetail = dynamic(() => import('@/plugins/builtin/work/contracts/SupplierDetail'), {
  loading: () => (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-card" />
        <Skeleton className="h-48 rounded-card" />
      </div>
    </div>
  ),
})

export default function SupplierDetailPage() {
  return <SupplierDetail />
}
