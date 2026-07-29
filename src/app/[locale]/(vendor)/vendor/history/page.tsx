import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import { formatDateTime } from "@/lib/utils";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";
import { Ticket } from "lucide-react";

async function getHistory() {
  return prisma.orderItem.findMany({
    where: { delivered: true },
    include: {
      student: true,
      foodItem: true,
      order: { include: { createdBy: { select: { name: true } } } },
      coveredByStudentPackage: { include: { package: { select: { name: true } } } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 50,
  });
}

export default async function VendorHistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [items, dict] = await Promise.all([getHistory(), getDictionary(locale)]);
  const t = dict.vendor.history;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{item.student.name}</div>
                <div className="text-sm text-slate-600">{item.foodItem.name}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.scheduledDate)}</div>
              </div>
              {item.coveredByStudentPackage ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  <Ticket className="h-3.5 w-3.5" />
                  {item.coveredByStudentPackage.package.name}
                </div>
              ) : null}
            </div>
            <div className="mt-2 text-xs text-slate-500">{t.registeredBy.replace("{name}", item.order.createdBy?.name ?? "Sistema")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
