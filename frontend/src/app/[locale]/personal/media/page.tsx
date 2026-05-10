import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

const MovieList = dynamic(() => import("@/plugins/personal/media/MovieList"), {
  loading: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
      {[...Array(8)].map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-lg" />
      ))}
    </div>
  ),
});

export default function MediaPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <PageHeader title={t("media.title")} />
      <MovieList />
    </div>
  );
}
