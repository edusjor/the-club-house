"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate, normalizePriceLevel } from "@/lib/utils";
import {
  resolveEarliestSchoolDate,
  resolveEarliestSchoolDateString,
  rollDateForwardOffWeekend,
  toDateInputString,
} from "@/lib/meal-scheduling";
import { useTranslations } from "@/i18n/I18nProvider";
import {
  classifyPackageLifecycle,
  findScheduledRenewal,
  PACKAGE_LIFECYCLE_BADGE_CLASSES,
  type PackageLifecycle,
} from "@/lib/package-lifecycle";
import { CalendarClock, CheckCircle2, PackagePlus, XCircle } from "lucide-react";

type PriceRow = { level: string; price: number };
type Student = { id: string; name: string; level: string };
type PackageOption = {
  id: string;
  name: string;
  description?: string | null;
  validityDays?: number | null;
  status: string;
  prices: PriceRow[];
};
type StudentPackage = {
  id: string;
  studentId: string;
  packageId: string;
  status: string;
  consumed: number;
  pricePaid: number;
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  student: { name: string; level: string };
  package: { id: string; name: string; validityDays?: number | null; prices: PriceRow[] };
};

// A parent can only self-cancel a purchase within 30 minutes of buying it
// (an "oops" undo window) — regardless of the coverage start date. Past
// that, only an admin can cancel or edit it. Mirrors the server-side check
// in /api/student-packages/[id].
const CANCEL_WINDOW_MS = 30 * 60 * 1000;

function isWithinCancelWindow(createdAt: string, reference: Date = new Date()): boolean {
  return reference.getTime() - new Date(createdAt).getTime() <= CANCEL_WINDOW_MS;
}

// Day after a package's expiration, rolled off weekends — the earliest
// sensible renewal start date (no overlap with the current coverage). If the
// package already expired a while ago, that day is in the past, so it's
// floored at the earliest day new commitments can start on (today/tomorrow).
function defaultRenewalDateString(endDate: string): string {
  const dayAfter = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000);
  const rolled = rollDateForwardOffWeekend(dayAfter);
  const earliest = resolveEarliestSchoolDate();
  return toDateInputString(rolled.getTime() > earliest.getTime() ? rolled : earliest);
}

function hasNotStartedYet(startDate: string, reference: Date = new Date()): boolean {
  return new Date(startDate).getTime() > reference.getTime();
}

function priceForLevel(prices: PriceRow[], level: string | undefined): number | null {
  if (!level) return null;
  const normalizedLevel = normalizePriceLevel(level);
  const row = prices.find((p) => normalizePriceLevel(p.level) === normalizedLevel);
  return row && row.price > 0 ? row.price : null;
}

const LIFECYCLE_LABEL_KEYS: Record<PackageLifecycle, string> = {
  ACTIVE: "parent.packages.stateActive",
  EXPIRING_SOON: "parent.packages.stateExpiringSoon",
  EXPIRED: "parent.packages.stateExpired",
  NOT_STARTED: "parent.packages.stateNotStarted",
};

function packageLifecycleDetailText(
  lifecycle: PackageLifecycle,
  pkg: StudentPackage,
  scheduledRenewal: StudentPackage | null,
  t: (key: string) => string
): string | null {
  if (lifecycle === "NOT_STARTED") {
    return `${t("parent.packages.startsOn")} ${formatDate(pkg.startDate)}`;
  }
  if (lifecycle === "ACTIVE") {
    return pkg.endDate
      ? `${t("parent.packages.activeUntil")} ${formatDate(pkg.endDate)}`
      : t("parent.packages.activeNoExpiry");
  }
  if (lifecycle === "EXPIRING_SOON" && pkg.endDate) {
    return `${t("parent.packages.expiresOn")} ${formatDate(pkg.endDate)}`;
  }
  if (lifecycle === "EXPIRED" && pkg.endDate) {
    const renewal = scheduledRenewal
      ? ` · ${t("parent.packages.renewalScheduledFor")} ${formatDate(scheduledRenewal.startDate)}`
      : "";
    return `${t("parent.packages.expiredSince")} ${formatDate(pkg.endDate)}${renewal}`;
  }
  return null;
}

export default function ParentPackagesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState(() => resolveEarliestSchoolDateString());
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewalDate, setRenewalDate] = useState("");

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["parent-students"],
    queryFn: () => axios.get("/api/students").then((response) => response.data),
  });

  const { data: packageOptions = [] } = useQuery<PackageOption[]>({
    queryKey: ["available-packages"],
    queryFn: () => axios.get("/api/packages").then((response) => response.data),
  });

  const { data: studentPackages = [] } = useQuery<StudentPackage[]>({
    queryKey: ["student-packages"],
    queryFn: () => axios.get("/api/student-packages").then((response) => response.data),
  });

  const selectedStudent = students.find((student) => student.id === studentId);

  // Package types the selected student already holds (non-cancelled) — for
  // those, the parent renews the existing purchase instead of buying a new
  // one, so they never end up with two overlapping packages of the same type.
  const heldPackageIds = useMemo(() => {
    if (!selectedStudent) return new Set<string>();
    return new Set(
      studentPackages
        .filter((sp) => sp.studentId === selectedStudent.id && sp.status === "ACTIVE")
        .map((sp) => sp.packageId)
    );
  }, [studentPackages, selectedStudent]);

  const availablePackages = useMemo(() => {
    if (!selectedStudent) return [];
    return packageOptions
      .filter((pkg) => pkg.status === "ACTIVE" && !heldPackageIds.has(pkg.id))
      .map((pkg) => ({ pkg, price: priceForLevel(pkg.prices, selectedStudent.level) }))
      .filter((entry): entry is { pkg: PackageOption; price: number } => entry.price !== null);
  }, [packageOptions, selectedStudent, heldPackageIds]);

  const renewMutation = useMutation({
    mutationFn: (vars: { studentId: string; packageId: string; startDate: string }) =>
      axios.post("/api/student-packages", vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-packages"] });
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      setFeedback(t("parent.packages.renewSuccess"));
      setError("");
      setRenewingId(null);
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : t("parent.packages.renewError");
      setFeedback("");
      setError(message);
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: () =>
      axios.post("/api/student-packages", {
        studentId,
        packageId,
        startDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-packages"] });
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      setFeedback(t("parent.packages.purchaseSuccess"));
      setError("");
      setPackageId("");
      setStudentId("");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : t("parent.packages.purchaseError");
      setFeedback("");
      setError(message);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (studentPackageId: string) =>
      axios.patch(`/api/student-packages/${studentPackageId}`, { action: "cancel" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-packages"] });
      queryClient.invalidateQueries({ queryKey: ["parent-balance"] });
      setFeedback(t("parent.packages.cancelSuccess"));
      setError("");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : t("parent.packages.cancelError");
      setFeedback("");
      setError(message);
    },
  });

  return (
    <div>
      <Header title={t("parent.packages.title")} subtitle={t("parent.packages.subtitle")} />
      <div className="p-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <PackagePlus className="h-4 w-4 text-cyan-600" />
            {t("parent.packages.buyPackage")}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">{t("parent.packages.studentLabel")}</span>
              <select
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value);
                  setPackageId("");
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
              >
                <option value="">{t("parent.packages.selectStudent")}</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} · {student.level}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">{t("parent.packages.packageLabel")}</span>
              <select
                value={packageId}
                onChange={(event) => setPackageId(event.target.value)}
                disabled={!selectedStudent}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm disabled:opacity-60"
              >
                <option value="">
                  {!selectedStudent
                    ? t("parent.packages.selectStudentFirst")
                    : availablePackages.length === 0
                    ? t("parent.packages.noPackagesForLevel")
                    : t("parent.packages.selectPackage")}
                </option>
                {availablePackages.map(({ pkg, price }) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} · {formatCurrency(price)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">{t("parent.packages.startDateLabel")}</span>
              <input
                type="date"
                value={startDate}
                min={resolveEarliestSchoolDateString()}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                if (!studentId || !packageId) {
                  setFeedback("");
                  setError(t("parent.packages.selectBothError"));
                  return;
                }

                setFeedback("");
                setError("");
                purchaseMutation.mutate();
              }}
              disabled={purchaseMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {purchaseMutation.isPending ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {purchaseMutation.isPending ? t("parent.packages.processing") : t("parent.packages.buyPackage")}
            </button>
          </div>

          {feedback && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {feedback}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {studentPackages.map((studentPackage) => {
          // What was actually charged for this specific purchase — not the
          // package's current list price, which can drift from it over time.
          const price = studentPackage.pricePaid;
          const notStarted = hasNotStartedYet(studentPackage.startDate);
          const canCancel = studentPackage.status === "ACTIVE" && isWithinCancelWindow(studentPackage.createdAt);
          const isCancelling =
            cancelMutation.isPending && cancelMutation.variables === studentPackage.id;

          // A renewal is only offered for the purchase currently in effect
          // (already started) — never a not-yet-started row — and only if
          // it actually expires and doesn't already have one scheduled.
          const scheduledRenewal = findScheduledRenewal(studentPackage, studentPackages);
          const hasScheduledRenewal = scheduledRenewal !== null;
          const lifecycle = studentPackage.status === "ACTIVE" ? classifyPackageLifecycle(studentPackage) : null;
          const lifecycleDetail = lifecycle
            ? packageLifecycleDetailText(lifecycle, studentPackage, scheduledRenewal, t)
            : null;
          const canRenew =
            studentPackage.status === "ACTIVE" &&
            !!studentPackage.endDate &&
            !notStarted &&
            !hasScheduledRenewal;
          const isRenewingThis = renewingId === studentPackage.id;
          const isRenewSubmitting =
            renewMutation.isPending && renewMutation.variables?.startDate === renewalDate;
          const defaultRenewalDate = studentPackage.endDate
            ? defaultRenewalDateString(studentPackage.endDate)
            : "";
          const showsGapWarning =
            isRenewingThis && renewalDate && defaultRenewalDate && renewalDate > defaultRenewalDate;

          return (
            <div key={studentPackage.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900">{studentPackage.student.name}</div>
                  <div className="text-sm text-slate-500">{studentPackage.package.name}</div>
                  {lifecycleDetail ? (
                    <div className="mt-1 text-xs text-slate-500">{lifecycleDetail}</div>
                  ) : (
                    <div className="mt-1 text-xs text-slate-500">{t("parent.packages.since")} {formatDate(studentPackage.startDate)}{studentPackage.endDate ? ` · ${t("parent.packages.until")} ${formatDate(studentPackage.endDate)}` : ""}</div>
                  )}
                </div>
                {lifecycle ? (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PACKAGE_LIFECYCLE_BADGE_CLASSES[lifecycle]}`}>
                    {t(LIFECYCLE_LABEL_KEYS[lifecycle])}
                  </span>
                ) : (
                  <StatusBadge status={studentPackage.status} />
                )}
              </div>
              <div className="mt-3 text-sm text-slate-600">{formatCurrency(price)} · {studentPackage.package.validityDays ?? 0} {t("parent.packages.days")}</div>

              {canCancel ? (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      if (!window.confirm(t("parent.packages.cancelConfirm"))) return;
                      setFeedback("");
                      setError("");
                      cancelMutation.mutate(studentPackage.id);
                    }}
                    disabled={cancelMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {isCancelling ? (
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {isCancelling ? t("parent.packages.cancelling") : t("parent.packages.cancel")}
                  </button>
                </div>
              ) : null}

              {hasScheduledRenewal ? (
                <p className="mt-3 text-right text-xs text-emerald-600">{t("parent.packages.alreadyRenewedNotice")}</p>
              ) : canRenew && !isRenewingThis ? (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => {
                      setRenewingId(studentPackage.id);
                      setRenewalDate(defaultRenewalDate);
                      setFeedback("");
                      setError("");
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {t("parent.packages.renew")}
                  </button>
                </div>
              ) : null}

              {isRenewingThis ? (
                <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 space-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-cyan-800">{t("parent.packages.renewalDateLabel")}</span>
                    <input
                      type="date"
                      value={renewalDate}
                      min={defaultRenewalDate}
                      onChange={(event) => setRenewalDate(event.target.value)}
                      className="h-9 rounded-lg border border-cyan-200 bg-white px-3 text-sm text-slate-900"
                    />
                  </div>

                  {showsGapWarning ? (
                    <p className="text-xs text-amber-700">
                      {t("parent.packages.renewalGapWarning")}
                    </p>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setRenewingId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                    >
                      {t("parent.packages.cancelRenewal")}
                    </button>
                    <button
                      onClick={() => {
                        setFeedback("");
                        setError("");
                        renewMutation.mutate({
                          studentId: studentPackage.studentId,
                          packageId: studentPackage.packageId,
                          startDate: renewalDate,
                        });
                      }}
                      disabled={renewMutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-60"
                    >
                      {isRenewSubmitting ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {t("parent.packages.confirmRenewal")}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
