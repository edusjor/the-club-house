"use client";

import Link from "@/i18n/Link";
import { AlertTriangle, Home } from "lucide-react";
import { useTranslations } from "@/i18n/I18nProvider";

export default function UnauthorizedPage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-cyan-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">{t("auth.unauthorized.title")}</h1>
          <p className="text-slate-500 text-sm mb-6">
            {t("auth.unauthorized.message")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-xl transition-colors"
          >
            <Home className="w-4 h-4" />
            {t("auth.unauthorized.backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
