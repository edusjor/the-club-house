import Header from "@/components/dashboard/Header";
import DietaryTagBadges, { DietaryTagLabels } from "@/components/dashboard/DietaryTagBadges";
import MonthlyMenuLinkButton from "@/components/parent/MonthlyMenuLinkButton";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatCurrency, normalizePriceLevel, PRICE_LEVELS } from "@/lib/utils";
import Image from "next/image";
import Link from "@/i18n/Link";
import { Info, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import type { MealPeriod } from "@/lib/meal-scheduling";
import { FOOD_TABS, getFoodTab, normalizeFoodToken, type FoodTab } from "@/lib/food-tabs";

const FIXED_MEAL_PERIOD_LABEL_KEY: Record<MealPeriod, "break" | "lunch" | "afterschool"> = {
  BREAK: "break",
  LUNCH: "lunch",
  AFTERSCHOOL: "afterschool",
};

function fixedMealPeriodLabel(mealPeriod: string, dict: Dictionary): string {
  const key = FIXED_MEAL_PERIOD_LABEL_KEY[mealPeriod as MealPeriod];
  return key ? dict.mealPeriods[key] : "";
}

const FOOD_TAB_DICT_KEY: Record<FoodTab, "general" | "drinks" | "casados" | "snack"> = {
  GENERAL: "general",
  DRINKS: "drinks",
  CASADOS: "casados",
  SNACK: "snack",
};

// The Snack tab is vendor-only stock (in-person walk-up sales) — parents
// never see it, so it's excluded before items reach this page at the query
// level (visibility: VENDOR_ONLY) and its pill is hidden here too.
const PARENT_VISIBLE_FOOD_TABS = FOOD_TABS.filter((tab) => tab.key !== "SNACK");

const levelLabelByValue = Object.fromEntries(
  PRICE_LEVELS.map((level) => [level.value, level.label])
) as Record<string, string>;

function resolveActiveTab(rawTab: string | undefined): FoodTab {
  if (!rawTab) return "GENERAL";

  const normalized = normalizeFoodToken(rawTab);
  if (["general", "comida-general", "comida_general"].includes(normalized)) {
    return "GENERAL";
  }
  if (["drinks", "bebidas", "bebida"].includes(normalized)) {
    return "DRINKS";
  }
  if (["casados", "casado"].includes(normalized)) {
    return "CASADOS";
  }

  return "GENERAL";
}

async function getMenuData() {
  return prisma.foodItem.findMany({
    where: { available: true, visibility: { not: "VENDOR_ONLY" } },
    include: {
      category: true,
      prices: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// Staff-only accounts (no children yet) see only the Staff price. Regular
// parents never see the Staff price. Once a staff member adds a child, they
// become staff+parent and see every tier (Staff plus the child tiers).
async function getVisiblePriceLevels(userId: string): Promise<Set<string> | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isStaff: true },
  });

  if (!user?.isStaff) {
    return new Set(["ELEMENTARY", "MIDDLE_HIGH", "ATHLETES"]);
  }

  const childrenCount = await prisma.student.count({
    where: { parentId: userId, user: { role: "STUDENT" } },
  });

  return childrenCount > 0 ? null : new Set(["STAFF"]);
}

type ParentMenuPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ tab?: string }>;
};

export default async function ParentMenuPage({ params, searchParams }: ParentMenuPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [items, dict, visiblePriceLevels] = await Promise.all([
    getMenuData(),
    getDictionary(locale),
    userId ? getVisiblePriceLevels(userId) : Promise.resolve(null),
  ]);
  const t = dict.parent.menu;
  const dietaryLabels: DietaryTagLabels = {
    GLUTEN_FREE: dict.dietaryTags.glutenFree,
    LACTOSE_FREE: dict.dietaryTags.lactoseFree,
    VEGETARIAN: dict.dietaryTags.vegetarian,
  };
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolveActiveTab(resolvedSearchParams?.tab);

  const categorizedItems: Record<FoodTab, typeof items> = {
    GENERAL: [],
    DRINKS: [],
    CASADOS: [],
    SNACK: [],
  };

  for (const item of items) {
    categorizedItems[getFoodTab(item)].push(item);
  }

  const visibleItems = categorizedItems[activeTab];

  const hasAnyItem = items.length > 0;

  return (
    <div>
      <Header
        title={t.title}
        subtitle={t.subtitle}
      />

      <div className="space-y-6 p-6">
        <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-6 py-7 text-white shadow-xl">
          <p className="text-cyan-300 text-xs font-semibold uppercase tracking-[0.2em]">
            {t.updatedBadge}
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight">
            {t.heroTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            {t.heroSubtitle}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100">
              <Info className="h-3.5 w-3.5" />
              {t.availableActiveOnly}
            </div>
            <Link
              href="/parent/plan"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
            >
              {t.goToPlan}
            </Link>
          </div>
        </section>

        {!hasAnyItem ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-800">
              {t.noMealsAvailable}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {t.tryLaterOrContact}
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {PARENT_VISIBLE_FOOD_TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                const count = categorizedItems[tab.key].length;
                const href =
                  tab.key === "GENERAL"
                    ? "/parent/menu"
                    : `/parent/menu?tab=${tab.key.toLowerCase()}`;

                return (
                  <Link
                    key={tab.key}
                    href={href}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "border-cyan-500 bg-cyan-500 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                    }`}
                  >
                    <span>{dict.foodTabs[FOOD_TAB_DICT_KEY[tab.key]]}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>

            {activeTab === "CASADOS" ? (
              <div>
                <MonthlyMenuLinkButton />
              </div>
            ) : null}

            {visibleItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-lg font-semibold text-slate-800">
                  {t.noOptionsInTab}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {t.tryAnotherTab}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item) => {
                  const visiblePrices = (
                    visiblePriceLevels
                      ? item.prices.filter((price) =>
                          visiblePriceLevels.has(normalizePriceLevel(price.level))
                        )
                      : item.prices
                  ).filter((price) => price.price > 1);

                  return (
                    <article
                      key={item.id}
                      className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
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

                        {item.fixedMealPeriod ? (
                          <span className="absolute left-3 top-3 rounded-full bg-cyan-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
                            {fixedMealPeriodLabel(item.fixedMealPeriod, dict)}
                          </span>
                        ) : null}
                      </div>

                      <div className="relative -mt-4 flex flex-1 flex-col rounded-t-[1.25rem] bg-white px-4 pb-4 pt-3">
                        <DietaryTagBadges rawTags={item.tags} labels={dietaryLabels} />

                        <h4 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-slate-900">
                          {item.name}
                        </h4>

                        {item.description ? (
                          <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        ) : null}

                        <div className="mt-auto pt-3">
                          {visiblePrices.length > 0 ? (
                            <div className="space-y-1 border-t border-cyan-100 pt-3">
                              {visiblePrices.map((price) => (
                                <div
                                  key={price.id}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-slate-500">
                                    {levelLabelByValue[price.level] ?? price.level}
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {formatCurrency(price.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="border-t border-cyan-100 pt-3 text-xs font-semibold text-slate-500">
                              {t.priceByLevel}
                            </p>
                          )}

                          <Link
                            href="/parent/plan"
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            {t.planMeals}
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
