import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Default to 'zh' if no valid locale detected
  if (!locale || !['zh', 'en'].includes(locale as string)) {
    locale = 'zh';
  }

  return {
    locale: locale as string,
    timeZone: 'Asia/Shanghai',
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
