"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { FileText, ExternalLink, X } from "lucide-react";
import BodyPortal from "@/components/BodyPortal";
import { useTranslations } from "@/i18n/I18nProvider";

export default function MonthlyMenuPdfButton() {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useQuery<{ url: string | null }>({
    queryKey: ["monthly-menu-pdf"],
    queryFn: () => axios.get("/api/monthly-menu").then((response) => response.data),
  });

  const url = data?.url ?? null;
  if (!url) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100"
      >
        <FileText className="h-4 w-4" />
        {t("parent.plan.viewMonthlyMenu")}
      </button>

      {isOpen ? (
        <BodyPortal>
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-black text-slate-900">
                  {t("parent.plan.monthlyMenuModalTitle")}
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("parent.plan.openInNewTab")}
                  </a>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    aria-label={t("common.close")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <iframe src={url} title={t("parent.plan.monthlyMenuModalTitle")} className="h-full w-full flex-1" />
            </div>
          </div>
        </BodyPortal>
      ) : null}
    </>
  );
}
