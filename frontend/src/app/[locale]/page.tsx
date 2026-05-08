'use client';

import { useTranslations } from 'next-intl';

export default function HomePage() {
  const t = useTranslations();
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">{t('app.name')}</h1>
        <p className="text-xl text-muted-foreground">{t('app.tagline')}</p>
      </div>
    </main>
  );
}
