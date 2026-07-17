import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

async function getMenu() {
  return prisma.foodItem.findMany({ include: { category: true, prices: true }, orderBy: { createdAt: "desc" } });
}

export default async function VendorMenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [items, dict] = await Promise.all([getMenu(), getDictionary(locale)]);
  const t = dict.vendor.menu;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-900">{item.name}</div>
                <div className="text-sm text-slate-500">{item.category.name}</div>
              </div>
              <StatusBadge status={item.available ? "ACTIVE" : "INACTIVE"} />
            </div>
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              {item.prices.map((price) => <div key={price.id}>{price.level}: {formatCurrency(price.price)}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}