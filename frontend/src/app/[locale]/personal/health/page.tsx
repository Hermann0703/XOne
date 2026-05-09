import { useTranslations } from "next-intl";
import Dashboard from '@/plugins/personal/health/Dashboard'
import { PageHeader } from '@/components/shared'

export default function HealthPage() {
  const t = useTranslations();
  return (
    <>
      <PageHeader title={t("health.title")} description={t("health.metrics.caloriesDesc")} />
      <Dashboard />
    </>
  )
}
