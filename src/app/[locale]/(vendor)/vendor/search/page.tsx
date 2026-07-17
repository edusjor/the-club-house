"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "@/i18n/Link";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useTranslations } from "@/i18n/I18nProvider";
import { Search, UtensilsCrossed } from "lucide-react";

type Student = { id: string; name: string; level: string; allergies?: string | null; active: boolean; parent?: { name: string; phone?: string | null }; studentPackages?: { status: string; remaining: number; package: { name: string } }[] };

export default function VendorSearchPage() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const { data: students = [], isLoading } = useQuery<Student[]>({ queryKey: ["vendor-search-students"], queryFn: () => axios.get("/api/students").then((r) => r.data) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((student) => student.name.toLowerCase().includes(q) || student.level.toLowerCase().includes(q) || (student.parent?.name ?? "").toLowerCase().includes(q));
  }, [students, search]);

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
                <StatusBadge status={student.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className="mt-3 text-sm text-slate-700">
                {!isStaff ? <div>{t("vendor.search.parent")}: {student.parent?.name ?? t("vendor.search.noParent")}</div> : null}
                <div>{t("vendor.search.phone")}: {student.parent?.phone ?? '—'}</div>
                <div className="mt-2 text-xs text-slate-500">{t("vendor.search.allergiesRestrictions")}: {student.allergies ?? t("vendor.search.none")}</div>
              </div>
              <div className="mt-4 space-y-2">
                {student.studentPackages?.length ? student.studentPackages.map((sp) => <div key={sp.package.name} className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-700">{sp.package.name} · {sp.remaining} {t("vendor.search.remaining")}</div>) : <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-500">{t("vendor.search.noActivePackage")}</div>}
              </div>
              <Link
                href={`/vendor/new-order?studentId=${student.id}`}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
              >
                <UtensilsCrossed className="h-4 w-4" />
                {t("vendor.search.newOrder")}
              </Link>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}