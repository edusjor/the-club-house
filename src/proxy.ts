import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { defaultLocale, isLocale, localePath, locales, type Locale } from "@/i18n/config";

function extractLocalePrefix(pathname: string): Locale | null {
  const match = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
  return match ?? null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;

  // Admin impersonation sessions are read-only by default (see src/auth.ts).
  // Enforce that centrally here rather than in every route handler, so a
  // route added later doesn't accidentally forget the check.
  if (pathname.startsWith("/api/")) {
    // NextAuth's own routes must always pass through untouched — otherwise a
    // read-only session could never call /api/auth/session to toggle
    // write-access or exit impersonation.
    if (pathname.startsWith("/api/auth/")) {
      return NextResponse.next();
    }

    if (!SAFE_METHODS.has(req.method)) {
      const user = req.auth?.user as
        | { impersonating?: boolean; impersonationWriteAllowed?: boolean }
        | undefined;
      if (user?.impersonating && !user.impersonationWriteAllowed) {
        return NextResponse.json(
          {
            error:
              "Acción bloqueada: estás viendo esta cuenta como administrador en modo solo lectura.",
          },
          { status: 403 }
        );
      }
    }
    return NextResponse.next();
  }

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
  matcher: ["/((?!api|_next|.*\\..*).*)", "/api/:path*"],
};
