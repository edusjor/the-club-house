import Header from "@/components/dashboard/Header";
import { prisma } from "@/lib/db";
import { formatCurrency, PRICE_LEVELS } from "@/lib/utils";
import Image from "next/image";
import Link from "@/i18n/Link";
import { Info, ShoppingCart, UtensilsCrossed } from "lucide-react";

type ParentMenuTab = "GENERAL" | "DRINKS" | "CASADOS";

const parentMenuTabs: { key: ParentMenuTab; label: string }[] = [
  { key: "GENERAL", label: "Comida general" },
  { key: "DRINKS", label: "Bebidas" },
  { key: "CASADOS", label: "Casados" },
];

const levelLabelByValue = Object.fromEntries(
  PRICE_LEVELS.map((level) => [level.value, level.label])
) as Record<string, string>;

function normalizeMenuToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getParentMenuTab(item: { name: string; category: { name: string } }): ParentMenuTab {
  const normalizedName = normalizeMenuToken(item.name);
  const normalizedCategory = normalizeMenuToken(item.category.name);

  if (normalizedName.includes("casado") || normalizedCategory.includes("casado")) {
    return "CASADOS";
  }

  if (
    normalizedCategory.includes("bebida") ||
    normalizedCategory.includes("drink") ||
    normalizedCategory.includes("jugo") ||
    normalizedCategory.includes("refresco")
  ) {
    return "DRINKS";
  }

  return "GENERAL";
}

function resolveActiveTab(rawTab: string | undefined): ParentMenuTab {
  if (!rawTab) return "GENERAL";

  const normalized = normalizeMenuToken(rawTab);
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
    where: { available: true },
    include: {
      category: true,
      prices: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

type ParentMenuPageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function ParentMenuPage({ searchParams }: ParentMenuPageProps) {
  const items = await getMenuData();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolveActiveTab(resolvedSearchParams?.tab);

  const categorizedItems: Record<ParentMenuTab, typeof items> = {
    GENERAL: [],
    DRINKS: [],
    CASADOS: [],
  };

  for (const item of items) {
    categorizedItems[getParentMenuTab(item)].push(item);
  }

  const visibleItems = categorizedItems[activeTab];

  const hasAnyItem = items.length > 0;

  return (
    <div>
      <Header
        title="Menu Escolar"
        subtitle="Explora comidas, usa pestañas y agrega opciones al plan de tus hijos"
      />

      <div className="space-y-6 p-6">
        <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-6 py-7 text-white shadow-xl">
          <p className="text-cyan-300 text-xs font-semibold uppercase tracking-[0.2em]">
            Menu actualizado
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight">
            Opciones nutritivas para toda la semana
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
            Visualiza el menu completo por pestañas, revisa precios por nivel
            y agrega comidas rapidamente al plan familiar.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100">
              <Info className="h-3.5 w-3.5" />
              Disponible solo para items activos
            </div>
            <Link
              href="/parent/plan"
              className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
            >
              Ir a Planificar
            </Link>
          </div>
        </section>

        {!hasAnyItem ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-800">
              No hay comidas disponibles en este momento.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Intenta de nuevo mas tarde o consulta con administracion.
            </p>
          </div>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {parentMenuTabs.map((tab) => {
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
                    <span>{tab.label}</span>
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

            {visibleItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-lg font-semibold text-slate-800">
                  No hay opciones en esta pestaña por ahora.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Prueba otra pestaña o vuelve a intentarlo mas tarde.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleItems.map((item) => {
                  return (
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

                        {item.prices.length > 0 ? (
                          <div className="mt-3 space-y-1 border-t border-cyan-100 pt-3">
                            {item.prices.map((price) => (
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
                          <p className="mt-3 border-t border-cyan-100 pt-3 text-xs font-semibold text-slate-500">
                            Precio segun nivel
                          </p>
                        )}

                        <div className="mt-3">
                          <Link
                            href="/parent/plan"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Ir a planificar comidas
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
