import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import AssetsDashboard from '@/plugins/personal/assets/Dashboard'

export default function AssetsDashboardPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.assets")} />
      <AssetsDashboard />
    </div>
  )
}
