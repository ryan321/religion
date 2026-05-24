/**
 * next-intl request config — invoked per-request to determine the locale and
 * load the matching messages file. We use a cookie ("locale") for persistence
 * with no URL prefixing, since the user explicitly picks a language from a
 * dropdown and we don't need per-locale SEO yet.
 *
 * Falls back to English UI strings when a translation file is missing for the
 * picked locale; this lets us support 60 languages of CONTENT while only
 * shipping UI translations for a curated subset.
 */
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isValidLocale } from "./locales";

export const LOCALE_COOKIE = "locale";

async function loadMessages(locale: string): Promise<Record<string, unknown>> {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // No UI translation for this locale yet — fall back to English.
    return (await import(`../../messages/en.json`)).default;
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = raw && isValidLocale(raw) ? raw : DEFAULT_LOCALE;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
