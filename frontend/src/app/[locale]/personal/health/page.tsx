import { useTranslations } from "next-intl";
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/shared'
import { Skeleton } from '@/components/ui/skeleton';

const HealthDashboard = dynamic(() => import('@/plugins/personal/health/Dashboard'), {
  loading: () => (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  ),
});
export default function HealthPage() {
  const t = useTranslations();
  return (
    <>
      <PageHeader title={t("health.title")} description={t("health.metrics.caloriesDesc")} />
      <HealthDashboard />
    </>
  )
}
