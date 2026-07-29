import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, localePath, locales, type Locale } from "@/i18n/config";

function extractLocalePrefix(pathname: string): Locale | null {
  const match = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  return match ?? null;
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const localePrefix = extractLocalePrefix(pathname);

  // The default locale (English) is served without a URL prefix: "/menu"
  // resolves internally to "/en/menu" via rewrite, keeping the visible URL
  // clean. Other locales keep a visible prefix, e.g. "/es/menu".
  const locale: Locale = localePrefix ?? (() => {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value ?? "";
    return isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  })();

  if (!localePrefix && locale !== defaultLocale) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}${search}`, req.url));
  }

  const session = req.auth;
  const path = localePrefix ? pathname.slice(`/${localePrefix}`.length) || "/" : pathname;

  const redirectWithLocale = (target: "login" | "unauthorized") =>
    NextResponse.redirect(new URL(localePath(locale, `/${target}`), req.url));

  if (path.startsWith("/admin")) {
    if (!session) {
      return redirectWithLocale("login");
    }
    if (session.user && (session.user as { role?: string }).role !== "ADMIN") {
      return redirectWithLocale("unauthorized");
    }
  }

  if (path.startsWith("/parent")) {
    if (!session) {
      return redirectWithLocale("login");
    }
    if (
      session.user &&
      (session.user as { role?: string }).role !== "PARENT" &&
      (session.user as { role?: string }).role !== "ADMIN"
    ) {
      return redirectWithLocale("unauthorized");
    }
  }

  if (path.startsWith("/vendor")) {
    if (!session) {
      return redirectWithLocale("login");
    }
    if (
      session.user &&
      (session.user as { role?: string }).role !== "VENDOR" &&
      (session.user as { role?: string }).role !== "ADMIN"
    ) {
      return redirectWithLocale("unauthorized");
    }
  }

  if (!localePrefix) {
    return NextResponse.rewrite(new URL(`/${locale}${pathname}${search}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
