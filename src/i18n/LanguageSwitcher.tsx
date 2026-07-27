"use client";

import { usePathname, useRouter } from "next/navigation";
import { defaultLocale, locales, type Locale } from "./config";
import { useLocale } from "./I18nProvider";

const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  es: "ES",
};

function setLocaleCookie(nextLocale: Locale): void {
  document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

function swapLocaleInPath(pathname: string, nextLocale: Locale): string {
  const segments = pathname.split("/");
  const currentIsLocale = (locales as readonly string[]).includes(segments[1] ?? "");
  const rest = currentIsLocale ? `/${segments.slice(2).join("/")}` : pathname;
  const cleanRest = rest === "/" ? "" : rest;

  if (nextLocale === defaultLocale) {
    return cleanRest || "/";
  }

  return `/${nextLocale}${cleanRest}`;
}

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (nextLocale: Locale) => {
    if (nextLocale === locale) return;

    setLocaleCookie(nextLocale);
    router.push(swapLocaleInPath(pathname, nextLocale));
    router.refresh();
  };

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 ${className ?? ""}`}
    >
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          className={`rounded-md px-2 py-1 text-xs font-bold transition-colors ${
            loc === locale ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
          aria-pressed={loc === locale}
        >
          {LOCALE_LABEL[loc]}
        </button>
      ))}
    </div>
  );
}
