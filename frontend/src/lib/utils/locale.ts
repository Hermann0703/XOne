/**
 * Locale utility — shared logic for extracting the current locale
 * from the browser's URL pathname.
 *
 * Used by error.tsx and not-found.tsx so we don't duplicate the
 * same regex / fallback logic.
 */

export function getLocaleFromPathname(): string {
  const m = window.location.pathname.match(/^\/(zh|en)\//)
  return m ? m[1] : 'zh'
}
