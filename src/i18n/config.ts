export const locales = ["en", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const intlLocale: Record<Locale, string> = {
  en: "en-US",
  es: "es-CR",
};

// The default locale is served without a URL prefix (e.g. "/menu" instead
// of "/en/menu"); other locales keep their prefix (e.g. "/es/menu").
export function localePath(locale: string, path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return locale === defaultLocale ? suffix : `/${locale}${suffix}`;
}
