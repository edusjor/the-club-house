"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
}

export function I18nProvider({ locale, dict, children }: I18nProviderProps) {
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18nContext() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslations/useLocale must be used within an I18nProvider");
  }
  return context;
}

function lookup(dict: Dictionary, key: string): unknown {
  return key.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
}

export function useTranslations() {
  const { dict } = useI18nContext();

  return useCallback(
    (key: string) => {
      const value = lookup(dict, key);
      return typeof value === "string" ? value : key;
    },
    [dict]
  );
}

export function useLocale(): Locale {
  return useI18nContext().locale;
}

export function useDictionary(): Dictionary {
  return useI18nContext().dict;
}
