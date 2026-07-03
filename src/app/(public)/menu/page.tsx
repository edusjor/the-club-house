import { prisma } from "@/lib/db";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Leaf, Wheat, Milk, TreePine, Info } from "lucide-react";

const tagIcons: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  healthy: { icon: Leaf, label: "Saludable", color: "text-emerald-600 bg-emerald-50" },
  vegetarian: { icon: Leaf, label: "Vegetariano", color: "text-green-600 bg-green-50" },
  "gluten-free": { icon: Wheat, label: "Sin Gluten", color: "text-yellow-600 bg-yellow-50" },
  dairy: { icon: Milk, label: "Con Lácteos", color: "text-blue-600 bg-blue-50" },
  nuts: { icon: TreePine, label: "Frutos Secos", color: "text-orange-600 bg-orange-50" },
};

async function getMenuData() {
  const [categories, items] = await Promise.all([
    prisma.foodCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
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

export default async function MenuPage() {
  const { categories, items } = await getMenuData();

  const byCategory = categories.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.categoryId === cat.id),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-cyan-900 text-white py-14 px-4 sm:px-6 text-center">
        <p className="text-cyan-400 font-semibold text-sm uppercase tracking-wider mb-2">
          Menú del mes
        </p>
        <h1 className="text-4xl sm:text-5xl font-black mb-4">
          Nuestro Menú
        </h1>
        <p className="text-slate-300 text-lg max-w-xl mx-auto">
          Comidas frescas, nutritivas y deliciosas para cada nivel escolar.
          Consulta disponibilidad y precios según el grado de tu hijo.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 px-4 py-2 rounded-full text-sm">
          <Info className="w-4 h-4" />
          Para realizar pedidos necesitas{" "}
          <Link href="/login" className="underline font-semibold hover:text-white">
            iniciar sesión
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {byCategory.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-semibold">El menú estará disponible pronto</p>
            <p className="text-sm mt-2">Vuelve más tarde para ver las opciones del día.</p>
          </div>
        ) : (
          byCategory.map((cat) =>
            cat.items.length > 0 ? (
              <section key={cat.id} className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-3 h-8 rounded-full"
                    style={{ backgroundColor: cat.color ?? "#0ea5e9" }}
                  />
                  <h2 className="text-2xl font-black text-slate-900">
                    {cat.name}
                  </h2>
                  <span className="text-sm text-slate-500">
                    ({cat.items.length} opciones)
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {cat.items.map((item) => {
                    const tags = item.tags ? JSON.parse(item.tags) as string[] : [];

                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg transition-all hover:-translate-y-0.5 group"
                      >
                        {/* Image / placeholder */}
                        <div className="h-44 bg-gradient-to-br from-cyan-50 to-cyan-100 flex items-center justify-center text-5xl relative overflow-hidden">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              unoptimized
                              loader={({ src }) => src}
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <span className="group-hover:scale-110 transition-transform">🍽️</span>
                          )}
                          <div className="absolute top-2 right-2">
                            <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold text-cyan-600 rounded-full shadow">
                              {cat.name}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-slate-900 mb-1 leading-tight">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-slate-500 text-xs leading-relaxed mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {tags.map((t) => {
                                const ti = tagIcons[t];
                                return (
                                  <span
                                    key={t}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ti?.color ?? "bg-slate-100 text-slate-600"}`}
                                  >
                                    {ti?.label ?? t}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Prices by level */}
                          {item.prices.length > 0 ? (
                            <div className="space-y-1 mb-3">
                              {item.prices.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span className="text-slate-500">
                                    {p.level === "PRESCHOOL"
                                      ? "Preescolar"
                                      : p.level === "ELEMENTARY"
                                      ? "Primaria"
                                      : p.level === "MIDDLE_HIGH"
                                      ? "Secundaria"
                                      : "Adulto"}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {formatCurrency(p.price)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-black text-slate-900 mb-3">
                              Precio según nivel
                            </p>
                          )}

                          <Link
                            href="/login"
                            className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-semibold rounded-xl transition-colors"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Pedir (requiere sesión)
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null
          )
        )}
      </div>
    </div>
  );
}

