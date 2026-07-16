"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { locales } from "./config";
import { useLocale } from "./I18nProvider";

type LinkProps = ComponentProps<typeof NextLink>;

function hasLocalePrefix(path: string): boolean {
  return locales.some((locale) => path === `/${locale}` || path.startsWith(`/${locale}/`));
}

export function localizeHref(locale: string, href: LinkProps["href"]): LinkProps["href"] {
  if (typeof href !== "string") return href;
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  if (hasLocalePrefix(href)) return href;

  return `/${locale}${href}`;
}

export default function Link({ href, ...rest }: LinkProps) {
  const locale = useLocale();
  return <NextLink href={localizeHref(locale, href)} {...rest} />;
}
