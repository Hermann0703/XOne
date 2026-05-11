import { redirect } from 'next/navigation'

export default function WorkPage({ params: { locale } }: { params: { locale: string } }) {
  redirect(`/${locale}/work/dashboard`)
}
