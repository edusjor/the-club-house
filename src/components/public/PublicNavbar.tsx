"use client";

import { useSession } from "next-auth/react";
import { ChefHat, Menu, X, LogIn } from "lucide-react";
import { useState } from "react";
import Link from "@/i18n/Link";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useTranslations } from "@/i18n/I18nProvider";

export default function PublicNavbar() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  const navLinks = [
    { href: "/", label: t("publicNav.home") },
    { href: "/menu", label: t("publicNav.menu") },
    { href: "/menu#preschool", label: t("publicNav.preschool") },
    { href: "/menu#elementary", label: t("publicNav.elementary") },
    { href: "/menu#middle", label: t("publicNav.middle") },
    { href: "/menu#this-month", label: t("publicNav.monthMenu") },
    { href: "/nutrition", label: t("publicNav.nutrition") },
  ];

  const dashboardHref =
    session?.user && (session.user as { role?: string }).role === "ADMIN"
      ? "/admin/dashboard"
      : session?.user && (session.user as { role?: string }).role === "VENDOR"
      ? "/vendor/dashboard"
      : session?.user && (session.user as { role?: string }).role === "PARENT"
      ? "/parent/dashboard"
      : "/unauthorized";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="block font-black text-slate-900 text-sm uppercase tracking-wide">
              The Club House
            </span>
            <span className="block text-cyan-500 text-[10px] font-semibold uppercase tracking-widest">
              {t("auth.layout.tagline")}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-slate-600 hover:text-cyan-600 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Auth */}
        <div className="hidden lg:flex items-center gap-3">
          <LanguageSwitcher />
          {session?.user ? (
            <Link
              href={dashboardHref}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {t("publicNav.myPanel")}
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {t("publicNav.signIn")}
            </Link>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
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
          <div className="pt-2">
            {session?.user ? (
              <Link
                href={dashboardHref}
                className="block w-full text-center px-4 py-2.5 bg-cyan-500 text-white text-sm font-semibold rounded-xl"
              >
                {t("publicNav.myPanel")}
              </Link>
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
