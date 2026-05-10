import { useTranslations } from "next-intl";
import dynamic from 'next/dynamic';
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from '@/components/ui/skeleton';

const AssetsDashboard = dynamic(() => import('@/plugins/personal/assets/Dashboard'), {
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

export default function AssetsDashboardPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.assets")} />
      <AssetsDashboard />
    </div>
  )
}
