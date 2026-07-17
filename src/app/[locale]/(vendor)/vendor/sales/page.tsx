import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import { formatCurrency } from "@/lib/utils";
import { Package, ShoppingCart, TrendingUp, UtensilsCrossed } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

async function getSalesData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [orders, consumptions, payments, sales] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.consumption.count({ where: { consumedAt: { gte: today } } }),
    prisma.payment.count({ where: { status: "APPROVED", createdAt: { gte: today } } }),
    prisma.order.aggregate({ where: { createdAt: { gte: today } }, _sum: { total: true } }),
  ]);
  return { orders, consumptions, payments, sales: sales._sum.total ?? 0 };
}

export default async function VendorSalesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [data, dict] = await Promise.all([getSalesData(), getDictionary(locale)]);
  const t = dict.vendor.sales;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title={t.orders} value={data.orders} icon={ShoppingCart} iconColor="text-cyan-600" iconBg="bg-cyan-100" subtitle={t.today} />
          <StatsCard title={t.consumptions} value={data.consumptions} icon={UtensilsCrossed} iconColor="text-emerald-600" iconBg="bg-emerald-100" subtitle={t.today} />
          <StatsCard title={t.approvedPayments} value={data.payments} icon={Package} iconColor="text-violet-600" iconBg="bg-violet-100" subtitle={t.today} />
          <StatsCard title={t.sales} value={formatCurrency(data.sales)} icon={TrendingUp} iconColor="text-orange-600" iconBg="bg-orange-100" subtitle={t.totalOfDay} />
        </div>
      </div>
    </div>
  );
}
