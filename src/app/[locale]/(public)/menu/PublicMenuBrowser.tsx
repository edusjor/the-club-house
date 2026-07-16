"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "@/i18n/Link";
import { Search, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { FOOD_TABS, getFoodTab, parseFoodTags, type FoodTab } from "@/lib/food-tabs";
import { useTranslations } from "@/i18n/I18nProvider";

export type PublicFoodItem = {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
  tags?: string | null;
  category: {
    id: string;
    name: string;
    color?: string | null;
  };
};

interface PublicMenuBrowserProps {
  items: PublicFoodItem[];
}

export default function PublicMenuBrowser({ items }: PublicMenuBrowserProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FoodTab>("GENERAL");
  const t = useTranslations();

  const filteredMenu = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items
      .filter((item) => {
        if (!normalizedSearch) return true;
        const tags = parseFoodTags(item.tags).join(" ").toLowerCase();
        return (
          item.name.toLowerCase().includes(normalizedSearch) ||
          (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
          item.category.name.toLowerCase().includes(normalizedSearch) ||
          tags.includes(normalizedSearch)
        );
      })
      .filter((item) => getFoodTab(item) === activeTab);
  }, [items, search, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<FoodTab, number> = {
      GENERAL: 0,
      DRINKS: 0,
      CASADOS: 0,
    };

    for (const item of items) {
      counts[getFoodTab(item)] += 1;
    }

    return counts;
  }, [items]);

  return (
    <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("publicMenu.searchPlaceholder")}
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FOOD_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-cyan-500 bg-cyan-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
              }`}
            >
              <span>{t(tab.labelKey)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {filteredMenu.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {t("publicMenu.noResultsTitle")}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {t("publicMenu.noResultsSubtitle")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredMenu.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative h-36 overflow-hidden bg-gradient-to-br from-cyan-50 to-slate-100 text-5xl">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    🍽️
                  </span>
                )}

                <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm">
                  <UtensilsCrossed className="h-5 w-5" />
                </div>
              </div>

              <div className="relative -mt-4 rounded-t-[1.25rem] bg-white px-4 pb-4 pt-3">
                <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                  {item.category.name}
                </span>

                <h4 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-slate-900">
                  {item.name}
                </h4>
                {item.description ? (
                  <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                ) : null}

                <Link
                  href="/login"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {t("publicMenu.order")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
