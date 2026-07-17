import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

async function getHistory() {
  return prisma.consumption.findMany({ include: { student: true, foodItem: true, registeredBy: { select: { name: true } } }, orderBy: { consumedAt: "desc" }, take: 50 });
}

export default async function VendorHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [consumptions, dict] = await Promise.all([getHistory(), getDictionary(locale)]);
  const t = dict.vendor.history;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 space-y-4">
        {consumptions.map((consumption) => (
          <div key={consumption.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{consumption.student.name}</div>
                <div className="text-sm text-slate-600">{consumption.foodItem.name}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTime(consumption.consumedAt)}</div>
              </div>
              <StatusBadge status="DELIVERED" />
            </div>
            <div className="mt-2 text-xs text-slate-500">{t.registeredBy.replace("{name}", consumption.registeredBy.name)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}