import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";

function extractLocalePrefix(pathname: string): Locale | null {
  const match = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  return match ?? null;
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const localePrefix = extractLocalePrefix(pathname);

  if (!localePrefix) {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value ?? "";
    const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}${pathname}${search}`, req.url));
  }

  const session = req.auth;
  const path = pathname.slice(`/${localePrefix}`.length) || "/";

  const redirectWithLocale = (target: "login" | "unauthorized") =>
    NextResponse.redirect(new URL(`/${localePrefix}/${target}`, req.url));

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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
