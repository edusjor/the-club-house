"use client";

import Link from "@/i18n/Link";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useTranslations } from "@/i18n/I18nProvider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>

        {/* Brand */}
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <img
            src="/assets/logo.webp"
            alt="The Club House"
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
          <p className="text-cyan-400 text-xs font-semibold uppercase tracking-widest">
            {t("auth.layout.tagline")}
          </p>
        </div>

        {children}

        <p className="text-center text-slate-500 text-sm mt-6">
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            {t("auth.layout.backToSite")}
          </Link>
        </p>
      </div>
    </div>
  );
}
