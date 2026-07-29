"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "@/i18n/Link";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useTranslations } from "@/i18n/I18nProvider";
import { useLocale } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/config";
import { getDashboardPath } from "@/lib/dashboard-path";

export default function PublicNavbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();

  // "Guide" is a fixed English label — it links to the English-only quick
  // guide, so it isn't run through translation like the other nav links.
  const navLinks = [
    { href: "/", label: t("publicNav.home") },
    { href: "/monthly-menu", label: t("publicNav.monthMenu") },
    { href: "/guide", label: "Guide" },
  ];

  const isActive = (href: string) => {
    const fullHref = localePath(locale, href);
    return href === "/" ? pathname === fullHref : pathname.startsWith(fullHref);
  };

  const dashboardHref = getDashboardPath(
    (session?.user as { role?: string } | undefined)?.role
  );

  const handleLogout = () => signOut({ callbackUrl: localePath(locale, "/") });

  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6 lg:pr-28 xl:pr-44">
        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-sm backdrop-blur-sm">
          {navLinks.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                  active
                    ? "bg-cyan-500 text-white"
                    : "text-cyan-900/70 hover:bg-cyan-50 hover:text-cyan-700"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop account area */}
        <div className="hidden lg:flex items-center gap-2">
          {session?.user ? (
            <>
              <Link
                href={dashboardHref}
                className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-600"
              >
                {t("publicNav.myPanel")}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                title={t("publicNav.logout")}
                className="rounded-full bg-white/90 p-2.5 text-cyan-900/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white/90 px-5 py-2.5 text-sm font-bold text-cyan-900/70 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-cyan-700"
            >
              {t("publicNav.signIn")}
            </Link>
          )}
        </div>

        {/* Mobile menu toggle — kept on the left since the logo already anchors the top-right corner on small screens */}
        <button
          className="lg:hidden p-2 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-600 rounded-lg transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="flex items-center justify-between gap-2 pt-2">
            <LanguageSwitcher />
          </div>
          <div className="pt-2 space-y-2">
            {session?.user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  className="block w-full text-center px-4 py-2.5 bg-cyan-500 text-white text-sm font-semibold rounded-xl"
                >
                  {t("publicNav.myPanel")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-center px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  {t("publicNav.logout")}
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="block w-full text-center px-4 py-2.5 bg-cyan-500 text-white text-sm font-semibold rounded-xl"
              >
                {t("publicNav.signIn")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
