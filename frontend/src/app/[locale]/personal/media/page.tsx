import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/shared/PageHeader";
import MovieList from '@/plugins/personal/media/MovieList'

export default function MediaPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t("media.title")} />
      <MovieList />
    </div>
  )
}
