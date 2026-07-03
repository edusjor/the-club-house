import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Baby, CreditCard, Package, ShoppingCart, TrendingUp } from "lucide-react";

async function getParentDashboardData() {
  const session = await auth();
  const parentId = (session?.user as { id?: string } | undefined)?.id;

  if (!parentId) {
    return {
      children: [],
      orders: [],
      payments: [],
      activePackages: [],
      summary: { childrenCount: 0, pendingOrders: 0, pendingPayments: 0, totalDue: 0, activePackages: 0, monthlySpend: 0 },
    };
  }

  const [children, orders, payments, activePackages, monthlySpend] = await Promise.all([
    prisma.student.findMany({
      where: { parentId },
      include: { studentPackages: { where: { status: "ACTIVE" }, include: { package: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.order.findMany({
      where: { parentId },
      include: { items: { include: { student: true, foodItem: true } }, payments: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.payment.findMany({
      where: { parentId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.studentPackage.findMany({
      where: { student: { parentId }, status: "ACTIVE" },
      include: { student: true, package: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.aggregate({
      where: {
        parentId,
        status: "APPROVED",
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
  ]);

  const pendingOrders = orders.filter((order) => order.status === "PENDING").length;
  const pendingPayments = payments.filter((payment) => payment.status === "PENDING").length;
  const totalDue = payments.filter((payment) => payment.status !== "APPROVED").reduce((sum, payment) => sum + payment.amount, 0);

  return {
    children,
    orders,
    payments,
    activePackages,
    summary: {
      childrenCount: children.length,
      pendingOrders,
      pendingPayments,
      totalDue,
      activePackages: activePackages.length,
      monthlySpend: monthlySpend._sum.amount ?? 0,
    },
  };
}

export default async function ParentDashboard() {
  const data = await getParentDashboardData();

  return (
    <div>
      <Header title="Dashboard Familiar" subtitle="Resumen de hijos, pagos y actividad reciente" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          <StatsCard title="Hijos vinculados" value={data.summary.childrenCount} icon={Baby} iconColor="text-cyan-600" iconBg="bg-cyan-100" subtitle="En tu cuenta" />
          <StatsCard title="Paquetes activos" value={data.summary.activePackages} icon={Package} iconColor="text-emerald-600" iconBg="bg-emerald-100" subtitle="Vigentes" />
          <StatsCard title="Pagos pendientes" value={data.summary.pendingPayments} icon={CreditCard} iconColor="text-yellow-600" iconBg="bg-yellow-100" subtitle={`${formatCurrency(data.summary.totalDue)} por revisar`} />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <StatsCard title="Pedidos pendientes" value={data.summary.pendingOrders} icon={ShoppingCart} iconColor="text-orange-600" iconBg="bg-orange-100" subtitle="En proceso" />
          <StatsCard title="Gasto del mes" value={formatCurrency(data.summary.monthlySpend)} icon={TrendingUp} iconColor="text-violet-600" iconBg="bg-violet-100" subtitle="Pagos aprobados" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Mis Hijos</h2>
              <Link href="/parent/children" className="text-xs text-cyan-600 font-semibold">Ver todo →</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.children.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Aún no hay estudiantes vinculados</p>
              ) : data.children.map((child) => (
                <div key={child.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">{child.name}</p>
                    <p className="text-xs text-slate-500">{child.grade} · {child.level}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={child.active ? "ACTIVE" : "INACTIVE"} />
                    <p className="mt-1 text-xs text-slate-500">{child.studentPackages[0]?.package.name ?? "Sin paquete activo"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Actividad Reciente</h2>
              <Link href="/parent/history" className="text-xs text-cyan-600 font-semibold">Ver historial →</Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.orders.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Sin pedidos recientes</p>
              ) : data.orders.map((order) => (
                <div key={order.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">Pedido #{order.id.slice(0, 6)}</p>
                    <p className="text-xs text-slate-500">{order.items.length} ítem(s) · {formatDateTime(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(order.total)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

