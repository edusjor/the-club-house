import Link from "@/i18n/Link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import MealCalendar from "@/components/dashboard/MealCalendar";
import { formatCurrency, formatDateTime, formatOrderNumber, formatPaymentNumber } from "@/lib/utils";
import { Baby, CreditCard, Package, ShoppingCart, TrendingUp, XCircle } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

type ActivityEvent =
  | { kind: "ORDER_CREATED"; id: string; date: Date; total: number; itemCount: number }
  | { kind: "ORDER_CANCELLED"; id: string; date: Date; total: number }
  | { kind: "PAYMENT"; id: string; date: Date; amount: number; status: string };

async function getParentDashboardData() {
  const session = await auth();
  const parentId = (session?.user as { id?: string } | undefined)?.id;

  if (!parentId) {
    return {
      children: [],
      activePackages: [],
      calendarItems: [],
      recentActivity: [] as ActivityEvent[],
      summary: { childrenCount: 0, activePackages: 0, pendingBalance: 0 },
    };
  }

  const now = new Date();
  const calendarWindowStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const calendarWindowEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

  const [children, recentOrders, recentPayments, activePackages, balance, calendarOrderItems] = await Promise.all([
    prisma.student.findMany({
      where: { parentId },
      include: { studentPackages: { where: { status: "ACTIVE" }, include: { package: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.order.findMany({
      where: { parentId },
      select: { id: true, status: true, total: true, createdAt: true, updatedAt: true, items: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.payment.findMany({
      where: { parentId },
      select: { id: true, amount: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.studentPackage.findMany({
      where: { student: { parentId }, status: "ACTIVE" },
      include: { student: true, package: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parentBalance.findUnique({
      where: { parentId },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { parentId, status: { not: "CANCELLED" } },
        scheduledDate: { gte: calendarWindowStart, lte: calendarWindowEnd },
      },
      select: {
        id: true,
        studentId: true,
        scheduledDate: true,
        price: true,
        quantity: true,
        student: { select: { name: true } },
        foodItem: { select: { name: true } },
        order: { select: { id: true, status: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  const events: ActivityEvent[] = [];
  for (const order of recentOrders) {
    events.push({ kind: "ORDER_CREATED", id: order.id, date: order.createdAt, total: order.total, itemCount: order.items.length });
    if (order.status === "CANCELLED") {
      events.push({ kind: "ORDER_CANCELLED", id: order.id, date: order.updatedAt, total: order.total });
    }
  }
  for (const payment of recentPayments) {
    events.push({ kind: "PAYMENT", id: payment.id, date: payment.createdAt, amount: payment.amount, status: payment.status });
  }
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    children,
    activePackages,
    calendarItems: calendarOrderItems.map((item) => ({
      id: item.id,
      studentId: item.studentId,
      studentName: item.student.name,
      scheduledDate: item.scheduledDate.toISOString(),
      foodItemName: item.foodItem.name,
      price: item.price,
      quantity: item.quantity,
      orderId: item.order.id,
      orderStatus: item.order.status,
    })),
    recentActivity: events.slice(0, 8),
    summary: {
      childrenCount: children.length,
      activePackages: activePackages.length,
      pendingBalance: balance?.pendingBalance ?? 0,
    },
  };
}

export default async function ParentDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [data, dict] = await Promise.all([getParentDashboardData(), getDictionary(locale)]);
  const t = dict.parent.dashboard;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <StatsCard title={t.linkedChildren} value={data.summary.childrenCount} icon={Baby} iconColor="text-cyan-600" iconBg="bg-cyan-100" subtitle={t.inYourAccount} />
          <StatsCard title={t.activePackages} value={data.summary.activePackages} icon={Package} iconColor="text-emerald-600" iconBg="bg-emerald-100" subtitle={t.current} />
          <Link href="/parent/balance" className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-cyan-200 transition-colors">
            <div className="p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.pendingBalance}</p>
                  <p className="text-xs text-slate-500">{t.accruedCredit}</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-black text-slate-900">{formatCurrency(data.summary.pendingBalance)}</p>
                <p className="text-xs text-cyan-600 font-semibold">{t.viewBalance}</p>
              </div>
            </div>
          </Link>
        </div>

        <MealCalendar
          students={data.children.map((child) => ({ id: child.id, name: child.name }))}
          items={data.calendarItems}
        />

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{t.myChildren}</h2>
              <Link href="/parent/children" className="text-xs text-cyan-600 font-semibold">{t.viewAll}</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.children.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">{t.noChildrenYet}</p>
              ) : data.children.map((child) => (
                <div key={child.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{child.name}</p>
                    <p className="text-xs text-slate-500">{child.level}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={child.active ? "ACTIVE" : "INACTIVE"} />
                    <p className="mt-1 text-xs text-slate-500">{child.studentPackages[0]?.package.name ?? t.noActivePackage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">{t.recentActivity}</h2>
              <Link href="/parent/history" className="text-xs text-cyan-600 font-semibold">{t.viewHistory}</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentActivity.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">{t.noRecentActivity}</p>
              ) : data.recentActivity.map((event) => {
                if (event.kind === "ORDER_CREATED") {
                  return (
                    <div key={`created-${event.id}`} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                          <ShoppingCart className="h-4 w-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{t.orderCreated.replace("{id}", formatOrderNumber(event.id))}</p>
                          <p className="text-xs text-slate-500">{event.itemCount} {t.items} · {formatDateTime(event.date)}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(event.total)}</p>
                    </div>
                  );
                }

                if (event.kind === "ORDER_CANCELLED") {
                  return (
                    <div key={`cancelled-${event.id}`} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
                          <XCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{t.orderCancelled.replace("{id}", formatOrderNumber(event.id))}</p>
                          <p className="text-xs text-slate-500">{formatDateTime(event.date)}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(event.total)}</p>
                    </div>
                  );
                }

                return (
                  <div key={`payment-${event.id}`} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                        <CreditCard className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{t.payment.replace("{id}", formatPaymentNumber(event.id))}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(event.date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">{formatCurrency(event.amount)}</p>
                      <StatusBadge status={event.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
