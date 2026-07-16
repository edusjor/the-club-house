"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import Link from "@/i18n/Link";
import { credentialsLoginAction } from "./actions";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
    >
      {pending ? (
        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <LogIn className="w-4 h-4" />
      )}
      {pending ? t("auth.login.submitting") : t("auth.login.submit")}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const authError = searchParams.get("error");
  const registered = searchParams.get("registered") === "1";
  const registeredEmail = searchParams.get("email");
  const errorMessage = authError ? t("auth.login.errorCredentials") : "";
  const registeredMessage = registeredEmail
    ? t("auth.login.registeredSuccessFor").replace("{email}", registeredEmail)
    : t("auth.login.registeredSuccess");

  const loginWithLocale = credentialsLoginAction.bind(null, locale);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">{t("auth.login.title")}</h1>
      <p className="text-slate-500 text-sm mb-7">
        {t("auth.login.subtitle")}
      </p>

      {errorMessage && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {errorMessage}
        </div>
      )}

      {registered ? (
        <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {registeredMessage}
        </div>
      ) : null}

      <form action={loginWithLocale} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.login.email")}
          </label>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t("auth.login.emailPlaceholder")}
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.login.password")}
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-11 px-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <SubmitButton />
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          {t("auth.login.noAccount")}{" "}
          <Link href="/register" className="font-semibold text-cyan-600 hover:text-cyan-700">
            {t("auth.login.createAccount")}
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginFallback() {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">{t("auth.login.loadingTitle")}</h1>
      <p className="text-slate-500 text-sm mb-7">{t("auth.login.loadingSubtitle")}</p>
      <div className="flex justify-center py-6">
        <span className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
