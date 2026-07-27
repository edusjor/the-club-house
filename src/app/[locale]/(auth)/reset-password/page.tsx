"use client";

import { Suspense, FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "@/i18n/Link";
import axios from "axios";
import { AlertCircle, Eye, EyeOff, KeyRound } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";
import { localePath } from "@/i18n/config";

function ResetPasswordForm() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError(t("auth.resetPassword.errorInvalidToken"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.resetPassword.errorPasswordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.resetPassword.errorPasswordMismatch"));
      return;
    }

    setSubmitting(true);

    try {
      await axios.post("/api/auth/reset-password", { token, password });
      router.push(localePath(locale, "/login?reset=1"));
    } catch (requestError: unknown) {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : t("auth.resetPassword.errorGeneric");
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">
        {t("auth.resetPassword.title")}
      </h1>
      <p className="text-slate-500 text-sm mb-7">
        {t("auth.resetPassword.subtitle")}
      </p>

      {!token ? (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {t("auth.resetPassword.errorInvalidToken")}
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
                {t("auth.resetPassword.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder={t("auth.resetPassword.passwordPlaceholder")}
                  className="w-full h-11 px-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                {t("auth.resetPassword.confirmPassword")}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t("auth.resetPassword.confirmPasswordPlaceholder")}
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
                <KeyRound className="w-4 h-4" />
              )}
              {submitting
                ? t("auth.resetPassword.submitting")
                : t("auth.resetPassword.submit")}
            </button>
          </form>
        </>
      )}

      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
            {t("auth.resetPassword.backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">
        {t("auth.resetPassword.title")}
      </h1>
      <div className="flex justify-center py-6">
        <span className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
