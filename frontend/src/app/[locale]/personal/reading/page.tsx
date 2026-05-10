import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { PageHeader } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

const BookList = dynamic(() => import("@/plugins/personal/reading/BookList"), {
  loading: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-lg" />
      ))}
    </div>
  ),
});

export default function ReadingPage() {
  const t = useTranslations();
  return (
    <>
      <PageHeader title={t("reading.title")} description={t("reading.stats.wantToRead")} />
      <BookList />
    </>
  );
}
