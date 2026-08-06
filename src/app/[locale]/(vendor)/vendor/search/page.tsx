"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "@/i18n/Link";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDate } from "@/lib/utils";
import { useTranslations } from "@/i18n/I18nProvider";
import {
  classifyPackageLifecycle,
  PACKAGE_LIFECYCLE_BADGE_CLASSES,
  type PackageLifecycle,
} from "@/lib/package-lifecycle";
import { AlertTriangle, Search } from "lucide-react";

type StudentPackage = {
  id: string;
  status: string;
  startDate: string;
  endDate?: string | null;
  package: { id: string; name: string };
};
type Student = {
  id: string;
  name: string;
  level: string;
  allergies?: string | null;
  active: boolean;
  parent?: { id: string; name: string; phone?: string | null; parentBalance?: { pendingBalance: number } | null };
  studentPackages?: StudentPackage[];
};

type PackageCardInfo = {
  packageName: string;
  lifecycle: PackageLifecycle;
  current: StudentPackage | null;
  upcoming: StudentPackage | null;
};

function groupPackages(studentPackages: StudentPackage[] | undefined, now: Date): PackageCardInfo[] {
  if (!studentPackages || studentPackages.length === 0) return [];

  const byPackageId = new Map<string, StudentPackage[]>();
  for (const sp of studentPackages) {
    const list = byPackageId.get(sp.package.id) ?? [];
    list.push(sp);
    byPackageId.set(sp.package.id, list);
  }

  const cards: PackageCardInfo[] = [];
  for (const list of byPackageId.values()) {
    // list is already sorted startDate desc (API orders it that way).
    const upcomingList = list.filter((sp) => new Date(sp.startDate).getTime() > now.getTime());
    const pastOrCurrentList = list.filter((sp) => new Date(sp.startDate).getTime() <= now.getTime());
    const current = pastOrCurrentList[0] ?? null;
    const upcoming = upcomingList.length > 0 ? upcomingList[upcomingList.length - 1] : null;

    cards.push({
      packageName: list[0].package.name,
      lifecycle: current ? classifyPackageLifecycle(current, now) : "NOT_STARTED",
      current,
      upcoming,
    });
  }
  return cards;
}

function packageDetailText(
  card: PackageCardInfo,
  t: (key: string) => string
): string | null {
  if (card.lifecycle === "NOT_STARTED" && card.upcoming) {
    return `${t("vendor.search.startsOn")} ${formatDate(card.upcoming.startDate)}`;
  }
  if (card.lifecycle === "ACTIVE" && card.current) {
    return card.current.endDate
      ? `${t("vendor.search.activeUntil")} ${formatDate(card.current.endDate)}`
      : t("vendor.search.activeNoExpiry");
  }
  if (card.lifecycle === "EXPIRING_SOON" && card.current?.endDate) {
    return `${t("vendor.search.expiresOn")} ${formatDate(card.current.endDate)}`;
  }
  if (card.lifecycle === "EXPIRED" && card.current?.endDate) {
    const renewal = card.upcoming
      ? ` · ${t("vendor.search.renewalScheduledFor")} ${formatDate(card.upcoming.startDate)}`
      : "";
    return `${t("vendor.search.expiredSince")} ${formatDate(card.current.endDate)}${renewal}`;
  }
  return null;
}

export default function VendorSearchPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const { data: students = [], isLoading } = useQuery<Student[]>({ queryKey: ["vendor-search-students"], queryFn: () => axios.get("/api/students").then((r) => r.data) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((student) => student.name.toLowerCase().includes(q) || student.level.toLowerCase().includes(q) || (student.parent?.name ?? "").toLowerCase().includes(q));
  }, [students, search]);

  const now = new Date();

  return (
    <div>
      <Header title={t("vendor.search.title")} subtitle={t("vendor.search.subtitle")} />
      <div className="p-6 space-y-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("vendor.search.searchPlaceholder")} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? <div className="text-slate-400">{t("vendor.search.loading")}</div> : filtered.map((student) => {
            const isStaff = student.level === "STAFF";
            const pendingBalance = student.parent?.parentBalance?.pendingBalance ?? 0;
            const packageCards = groupPackages(student.studentPackages, now);

            return (
            <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                    <span>{student.name}</span>
                    {isStaff ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                        {t("common.staffLabel")}
                      </span>
                    ) : null}
                  </h3>
                  <p className="text-sm text-slate-500">{isStaff ? t("common.staffLevelLabel") : student.level}</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <StatusBadge status={student.active ? 'ACTIVE' : 'INACTIVE'} />
                  {!isStaff && student.parent ? (
                    <Link
                      href={`/vendor/parents/${student.parent.id}`}
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap transition-colors hover:brightness-95 ${
                        pendingBalance > 0
                          ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                      title={t("vendor.search.viewBalance")}
                    >
                      {pendingBalance > 0 ? t("vendor.search.accountPendingPayment") : t("vendor.search.accountUpToDate")}
                    </Link>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 text-sm text-slate-700">
                {!isStaff ? <div>{t("vendor.search.parent")}: {student.parent?.name ?? t("vendor.search.noParent")}</div> : null}
                <div>{t("vendor.search.phone")}: {student.parent?.phone ?? '—'}</div>
                {student.allergies?.trim() ? (
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t("vendor.search.allergiesRestrictions")}: {student.allergies}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-500">{t("vendor.search.allergiesRestrictions")}: {t("vendor.search.none")}</div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {packageCards.length === 0 ? (
                  <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">{t("vendor.search.noActivePackage")}</span>
                ) : packageCards.map((card) => {
                  const detail = packageDetailText(card, t);
                  return (
                    <span
                      key={card.packageName}
                      className={`inline-flex items-baseline gap-1.5 rounded-lg border px-3 py-1.5 text-xs ${PACKAGE_LIFECYCLE_BADGE_CLASSES[card.lifecycle]}`}
                    >
                      <span className="font-semibold">{card.packageName}</span>
                      {detail ? <span className="opacity-80">· {detail}</span> : null}
                    </span>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
