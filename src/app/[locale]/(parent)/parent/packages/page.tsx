"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate, normalizePriceLevel } from "@/lib/utils";
import { useTranslations } from "@/i18n/I18nProvider";
import { CheckCircle2, PackagePlus, XCircle } from "lucide-react";

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
  status: string;
  consumed: number;
  pricePaid: number;
  startDate: string;
  endDate?: string | null;
  student: { name: string; level: string };
  package: { name: string; validityDays?: number | null; prices: PriceRow[] };
};

function hasNotStartedYet(startDate: string, reference: Date = new Date()): boolean {
  return new Date(startDate).getTime() > reference.getTime();
}

function priceForLevel(prices: PriceRow[], level: string | undefined): number | null {
  if (!level) return null;
  const normalizedLevel = normalizePriceLevel(level);
  const row = prices.find((p) => normalizePriceLevel(p.level) === normalizedLevel);
  return row && row.price > 0 ? row.price : null;
}

export default function ParentPackagesPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

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

  const availablePackages = useMemo(() => {
    if (!selectedStudent) return [];
    return packageOptions
      .filter((pkg) => pkg.status === "ACTIVE")
      .map((pkg) => ({ pkg, price: priceForLevel(pkg.prices, selectedStudent.level) }))
      .filter((entry): entry is { pkg: PackageOption; price: number } => entry.price !== null);
  }, [packageOptions, selectedStudent]);

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
          const price = priceForLevel(studentPackage.package.prices, studentPackage.student.level) ?? 0;
          const notStarted = hasNotStartedYet(studentPackage.startDate);
          const canCancel = studentPackage.status === "ACTIVE" && notStarted;
          const alreadyStarted = studentPackage.status === "ACTIVE" && !notStarted;
          const isCancelling =
            cancelMutation.isPending && cancelMutation.variables === studentPackage.id;

          return (
            <div key={studentPackage.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900">{studentPackage.student.name}</div>
                  <div className="text-sm text-slate-500">{studentPackage.package.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{t("parent.packages.consumed")}: {studentPackage.consumed}</div>
                  <div className="mt-1 text-xs text-slate-500">{t("parent.packages.since")} {formatDate(studentPackage.startDate)}{studentPackage.endDate ? ` · ${t("parent.packages.until")} ${formatDate(studentPackage.endDate)}` : ""}</div>
                </div>
                <StatusBadge status={studentPackage.status} />
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
              ) : alreadyStarted ? (
                <p className="mt-3 text-right text-xs text-slate-400">{t("parent.packages.alreadyStartedNotice")}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
