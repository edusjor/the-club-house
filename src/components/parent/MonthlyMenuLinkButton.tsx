"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Images } from "lucide-react";
import Link from "@/i18n/Link";
import { useTranslations } from "@/i18n/I18nProvider";

export default function MonthlyMenuLinkButton() {
  const t = useTranslations();

  const { data } = useQuery<{ id: string }[]>({
    queryKey: ["monthly-menu-images"],
    queryFn: () => axios.get("/api/monthly-menu-images").then((response) => response.data),
  });

  if (!data || data.length === 0) return null;

  // Opens in a new tab so an in-progress order draft isn't lost.
  return (
    <Link
      href="/monthly-menu"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-700 transition-colors hover:bg-cyan-100"
    >
      <Images className="h-4 w-4" />
      {t("parent.plan.viewMonthlyMenu")}
    </Link>
  );
}
