"use client";

import Link from "@/i18n/Link";
import { FormEvent, useState } from "react";
import axios from "axios";
import { AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t("auth.forgotPassword.errorRequired"));
      return;
    }

    setSubmitting(true);

    try {
      await axios.post("/api/auth/forgot-password", {
        email: normalizedEmail,
        locale,
      });
      setSent(true);
    } catch {
      setError(t("auth.forgotPassword.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">
        {t("auth.forgotPassword.title")}
      </h1>
      <p className="text-slate-500 text-sm mb-7">
        {t("auth.forgotPassword.subtitle")}
      </p>

      {sent ? (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {t("auth.forgotPassword.successMessage")}
        </div>
      ) : (
        <>
          {error ? (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                {t("auth.forgotPassword.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("auth.forgotPassword.emailPlaceholder")}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              {submitting
                ? t("auth.forgotPassword.submitting")
                : t("auth.forgotPassword.submit")}
            </button>
          </form>
        </>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
            {t("auth.forgotPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}
