import Header from "@/components/dashboard/Header";
import { prisma } from "@/lib/db";
import { formatCurrency, LEVELS } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { Info, Leaf, Milk, ShoppingCart, TreePine, Wheat } from "lucide-react";

const levelLabelByValue = Object.fromEntries(
  LEVELS.map((level) => [level.value, level.label])
) as Record<string, string>;

const tagStyleByKey: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  healthy: {
    icon: Leaf,
    label: "Saludable",
    color: "text-emerald-600 bg-emerald-50",
  },
  vegetarian: {
    icon: Leaf,
    label: "Vegetariano",
    color: "text-green-600 bg-green-50",
  },
  "gluten-free": {
    icon: Wheat,
    label: "Sin Gluten",
    color: "text-yellow-700 bg-yellow-50",
  },
  dairy: {
    icon: Milk,
    label: "Con Lacteos",
    color: "text-blue-600 bg-blue-50",
  },
  nuts: {
    icon: TreePine,
    label: "Frutos Secos",
    color: "text-orange-600 bg-orange-50",
  },
};

function parseTagList(rawTags: string | null): string[] {
  if (!rawTags) return [];
  try {
    const parsed: unknown = JSON.parse(rawTags);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

async function getMenuData() {
  const [categories, items] = await Promise.all([
    prisma.foodCategory.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.foodItem.findMany({
      where: { available: true },
      include: {
        category: true,
        prices: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { categories, items };
}

export default async function ParentMenuPage() {
  const { categories, items } = await getMenuData();

  const byCategory = categories
    .map((category) => ({
      ...category,
      items: items.filter((item) => item.categoryId === category.id),
    }))
    .filter((category) => category.items.length > 0);

  return (
    <div>
      <Header
        title="Menu Escolar"
        subtitle="Explora comidas por categoria y agrega opciones al plan de tus hijos"
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
            Visualiza el menu completo por categoria, revisa precios por nivel
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

        {byCategory.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-lg font-semibold text-slate-800">
              No hay comidas disponibles en este momento.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Intenta de nuevo mas tarde o consulta con administracion.
            </p>
          </div>
        ) : (
          byCategory.map((category) => (
            <section key={category.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-3 rounded-full"
                  style={{ backgroundColor: category.color ?? "#06b6d4" }}
                />
                <h3 className="text-2xl font-black text-slate-900">
                  {category.name}
                </h3>
                <span className="text-sm font-medium text-slate-500">
                  ({category.items.length} opciones)
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {category.items.map((item) => {
                  const tags = parseTagList(item.tags);

                  return (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-50 to-slate-100 text-5xl">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            unoptimized
                            loader={({ src }) => src}
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <span className="transition-transform duration-300 group-hover:scale-110">
                            🍽️
                          </span>
                        )}

                        <span className="absolute right-3 top-3 rounded-full border border-white/60 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700 shadow-sm backdrop-blur-sm">
                          {item.category.name}
                        </span>
                      </div>

                      <div className="p-4">
                        <h4 className="text-base font-bold leading-tight text-slate-900">
                          {item.name}
                        </h4>

                        {item.description ? (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        ) : null}

                        {tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {tags.map((tag) => {
                              const tagStyle = tagStyleByKey[tag];
                              const Icon = tagStyle?.icon;
                              return (
                                <span
                                  key={tag}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    tagStyle?.color ??
                                    "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {Icon ? <Icon className="h-3 w-3" /> : null}
                                  {tagStyle?.label ?? tag}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}

                        {item.prices.length > 0 ? (
                          <div className="mt-4 space-y-1.5">
                            {item.prices.map((price) => (
                              <div
                                key={price.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-slate-500">
                                  {levelLabelByValue[price.level] ?? price.level}
                                </span>
                                <span className="font-bold text-slate-900">
                                  {formatCurrency(price.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-4 text-xs font-semibold text-slate-500">
                            Precio segun nivel
                          </p>
                        )}

                        <div className="mt-4">
                          <Link
                            href={`/parent/plan?foodId=${item.id}`}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-600"
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Agregar al plan
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
