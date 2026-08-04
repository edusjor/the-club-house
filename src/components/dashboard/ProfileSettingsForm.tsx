"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Mail, KeyRound, IdCard } from "lucide-react";
import { useTranslations } from "@/i18n/I18nProvider";

interface ProfileSettingsFormProps {
  initialEmail: string;
  initialCedula?: string;
}

export default function ProfileSettingsForm({ initialEmail, initialCedula }: ProfileSettingsFormProps) {
  const t = useTranslations();
  const router = useRouter();

  const [cedula, setCedula] = useState(initialCedula ?? "");
  const [cedulaSubmitting, setCedulaSubmitting] = useState(false);
  const [cedulaError, setCedulaError] = useState("");
  const [cedulaSuccess, setCedulaSuccess] = useState(false);

  const [email, setEmail] = useState(initialEmail);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const submitCedula = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCedulaError("");
    setCedulaSuccess(false);

    const trimmedCedula = cedula.trim();
    if (!trimmedCedula) {
      setCedulaError(t("common.profileForm.errorCedulaRequired"));
      return;
    }

    setCedulaSubmitting(true);
    try {
      await axios.patch("/api/me/cedula", { cedula: trimmedCedula });
      setCedulaSuccess(true);
      router.refresh();
    } catch (requestError: unknown) {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : t("common.profileForm.errorGeneric");
      setCedulaError(message);
    } finally {
      setCedulaSubmitting(false);
    }
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setEmailSuccess(false);

    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError(t("common.profileForm.errorEmailInvalid"));
      return;
    }

    if (!emailCurrentPassword) {
      setEmailError(t("common.profileForm.errorCurrentPasswordRequired"));
      return;
    }

    setEmailSubmitting(true);
    try {
      await axios.patch("/api/me/email", {
        email: trimmedEmail,
        currentPassword: emailCurrentPassword,
      });
      setEmailSuccess(true);
      setEmailCurrentPassword("");
      router.refresh();
    } catch (requestError: unknown) {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : t("common.profileForm.errorGeneric");
      setEmailError(message);
    } finally {
      setEmailSubmitting(false);
    }
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError(t("common.profileForm.errorCurrentPasswordRequired"));
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError(t("common.profileForm.errorPasswordLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("common.profileForm.errorPasswordMismatch"));
      return;
    }

    setPasswordSubmitting(true);
    try {
      await axios.patch("/api/me/password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError: unknown) {
      const message =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : t("common.profileForm.errorGeneric");
      setPasswordError(message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">{t("common.profileForm.cedulaSectionTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("common.profileForm.cedulaSectionSubtitle")}</p>

        {cedulaError ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {cedulaError}
          </div>
        ) : null}
        {cedulaSuccess ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {t("common.profileForm.successCedula")}
          </div>
        ) : null}

        <form onSubmit={submitCedula} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("common.profileForm.cedulaLabel")}
            </label>
            <input
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              placeholder={t("common.profileForm.cedulaPlaceholder")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            type="submit"
            disabled={cedulaSubmitting}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 font-bold text-white transition-colors hover:bg-cyan-600 disabled:opacity-60"
          >
            {cedulaSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <IdCard className="h-4 w-4" />
            )}
            {cedulaSubmitting ? t("common.profileForm.savingCedula") : t("common.profileForm.saveCedula")}
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">{t("common.profileForm.emailSectionTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("common.profileForm.emailSectionSubtitle")}</p>

        {emailError ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {emailError}
          </div>
        ) : null}
        {emailSuccess ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {t("common.profileForm.successEmail")}
          </div>
        ) : null}

        <form onSubmit={submitEmail} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("common.profileForm.emailLabel")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t("common.profileForm.emailPlaceholder")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("common.profileForm.currentPasswordLabel")}
            </label>
            <div className="relative">
              <input
                type={showEmailCurrentPassword ? "text" : "password"}
                value={emailCurrentPassword}
                onChange={(e) => setEmailCurrentPassword(e.target.value)}
                required
                placeholder={t("common.profileForm.currentPasswordPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowEmailCurrentPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showEmailCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={emailSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 font-bold text-white transition-colors hover:bg-cyan-600 disabled:opacity-60"
          >
            {emailSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {emailSubmitting ? t("common.profileForm.savingEmail") : t("common.profileForm.saveEmail")}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-slate-900">{t("common.profileForm.passwordSectionTitle")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("common.profileForm.passwordSectionSubtitle")}</p>

        {passwordError ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {passwordError}
          </div>
        ) : null}
        {passwordSuccess ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            {t("common.profileForm.successPassword")}
          </div>
        ) : null}

        <form onSubmit={submitPassword} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("common.profileForm.currentPasswordLabel")}
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder={t("common.profileForm.currentPasswordPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("common.profileForm.newPasswordLabel")}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t("common.profileForm.newPasswordPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              {t("common.profileForm.confirmPasswordLabel")}
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t("common.profileForm.confirmPasswordPlaceholder")}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordSubmitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 font-bold text-white transition-colors hover:bg-cyan-600 disabled:opacity-60"
          >
            {passwordSubmitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {passwordSubmitting ? t("common.profileForm.savingPassword") : t("common.profileForm.savePassword")}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
