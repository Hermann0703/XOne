import { useTranslations } from "next-intl";
import BookList from '@/plugins/personal/reading/BookList'
import { PageHeader } from '@/components/shared'

export default function ReadingPage() {
  const t = useTranslations();
  return (
    <>
      <PageHeader title={t("reading.title")} description={t("reading.stats.wantToRead")} />
      <BookList />
    </>
  )
}
