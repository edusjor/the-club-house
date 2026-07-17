"use client";

import Link from "@/i18n/Link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import axios from "axios";
import { AlertCircle, Baby, BriefcaseBusiness, Eye, EyeOff, UserPlus, Users } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";

type AccountType = "PARENT" | "PARENT_STAFF" | "STAFF";

export default function RegisterPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("PARENT");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const accountTypeOptions: {
    value: AccountType;
    labelKey: string;
    descKey: string;
    confirmHintKey: string;
    icon: React.ElementType;
  }[] = [
    {
      value: "PARENT",
      labelKey: "auth.register.typeParent",
      descKey: "auth.register.typeParentDesc",
      confirmHintKey: "auth.register.confirmHintParent",
      icon: Baby,
    },
    {
      value: "PARENT_STAFF",
      labelKey: "auth.register.typeParentStaff",
      descKey: "auth.register.typeParentStaffDesc",
      confirmHintKey: "auth.register.confirmHintParentStaff",
      icon: Users,
    },
    {
      value: "STAFF",
      labelKey: "auth.register.typeStaff",
      descKey: "auth.register.typeStaffDesc",
      confirmHintKey: "auth.register.confirmHintStaff",
      icon: BriefcaseBusiness,
    },
  ];

  const selectedAccountType = accountTypeOptions.find(
    (option) => option.value === accountType
  ) ?? accountTypeOptions[0];

  const submitRegister = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      setError(t("auth.register.errorRequired"));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.register.errorPasswordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.register.errorPasswordMismatch"));
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmAndCreate = async () => {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    setShowConfirmModal(false);
    setSubmitting(true);

    try {
      await axios.post("/api/register", {
        name: normalizedName,
        email: normalizedEmail,
        phone,
        password,
        isStaff: accountType !== "PARENT",
      });

      router.push(
        `/${locale}/login?registered=1&email=${encodeURIComponent(normalizedEmail)}`
      );
    } catch (requestError: unknown) {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : t("auth.register.errorGeneric");

      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h1 className="text-2xl font-black text-slate-900 mb-1">{t("auth.register.title")}</h1>
      <p className="text-slate-500 text-sm mb-7">
        {t("auth.register.subtitle")}
      </p>

      {error ? (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      ) : null}

      <form onSubmit={submitRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.register.fullName")}
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            placeholder={t("auth.register.fullNamePlaceholder")}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.register.email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            placeholder="tu@email.com"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.register.phoneOptional")}
          </label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
            placeholder="8888-8888"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.register.password")}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
              placeholder={t("auth.register.passwordPlaceholder")}
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
            {t("auth.register.confirmPassword")}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
              placeholder={t("auth.register.confirmPasswordPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <p className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
            {t("auth.register.accountTypeLabel")}
          </p>
          <div className="space-y-2">
            {accountTypeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = accountType === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAccountType(option.value)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    isActive
                      ? "border-cyan-400 bg-cyan-50 text-slate-900"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-300"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-cyan-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-semibold">{t(option.labelKey)}</span>
                    <span className="block text-xs text-slate-500">{t(option.descKey)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-11 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          {submitting ? t("auth.register.submitting") : t("auth.register.submit")}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-500">
        {t("auth.register.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
          {t("auth.register.signIn")}
        </Link>
      </div>

      {showConfirmModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">
              {t("auth.register.confirmTitle")}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {t("auth.register.confirmQuestion")}
            </p>

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white">
                <selectedAccountType.icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  {t(selectedAccountType.labelKey)}
                </span>
                <span className="block text-xs text-slate-600">
                  {t(selectedAccountType.confirmHintKey)}
                </span>
              </span>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("auth.register.confirmBack")}
              </button>
              <button
                type="button"
                onClick={confirmAndCreate}
                className="flex-1 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-cyan-600"
              >
                {t("auth.register.confirmCreate")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
