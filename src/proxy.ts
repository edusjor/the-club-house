import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, localePath, locales, type Locale } from "@/i18n/config";
import { isComingSoonEnabled } from "@/lib/site-settings";

function extractLocalePrefix(pathname: string): Locale | null {
  const match = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  return match ?? null;
}

// Paths that stay reachable while "coming soon" mode is on, so an admin can
// still sign in and manage the site. Disabling it is always manual — the
// target date shown on the coming-soon page is purely informational.
const COMING_SOON_ALLOWED_PATHS = ["/login", "/admin", "/coming-soon"];

function isAllowedDuringComingSoon(path: string): boolean {
  return COMING_SOON_ALLOWED_PATHS.some(
    (allowed) => path === allowed || path.startsWith(`${allowed}/`)
  );
}

export default auth(async (req) => {
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

  if (!isAllowedDuringComingSoon(path) && (await isComingSoonEnabled())) {
    return NextResponse.rewrite(new URL(`/${locale}/coming-soon${search}`, req.url));
  }

  if (!localePrefix) {
    return NextResponse.rewrite(new URL(`/${locale}${pathname}${search}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
