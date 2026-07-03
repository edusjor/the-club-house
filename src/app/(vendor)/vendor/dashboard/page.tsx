import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ClipboardList, Search, ShoppingCart, TrendingUp, UtensilsCrossed, Users } from "lucide-react";

function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start, end };
}

async function getVendorDashboardData() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const { start, end } = getDayBounds();

  const [todayOrders, pendingOrders, todayConsumptions, activeStudents, recentOrders] = await Promise.all([
    prisma.order.count({
      where: {
        items: {
          some: {
            scheduledDate: { gte: start, lte: end },
          },
        },
      },
    }),
    prisma.orderItem.aggregate({
      where: {
        delivered: false,
        scheduledDate: { gte: start, lte: end },
      },
      _sum: { quantity: true },
    }),
    prisma.consumption.count({ where: { consumedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.student.count({ where: { active: true } }),
    prisma.order.findMany({
      take: 6,
      where: {
        items: {
          some: {
            scheduledDate: { gte: start, lte: end },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        parent: { select: { name: true } },
        items: {
          where: { scheduledDate: { gte: start, lte: end } },
          include: { student: true, foodItem: true },
        },
      },
    }),
  ]);

  const monthlySales = await prisma.payment.aggregate({
    where: {
      status: "APPROVED",
      createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
    },
    _sum: { amount: true },
  });

  return {
    todayOrders,
    pendingOrders: pendingOrders._sum.quantity ?? 0,
    todayConsumptions,
    activeStudents,
    recentOrders,
    monthlySales: monthlySales._sum.amount ?? 0,
    userId,
  };
}

export default async function VendorDashboard() {
  const data = await getVendorDashboardData();

  return (
    <div>
      <Header title="Panel Vendedor" subtitle="Pedidos del día, consumos y actividad operativa" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatsCard title="Pedidos de hoy" value={data.todayOrders} icon={ShoppingCart} iconColor="text-cyan-600" iconBg="bg-cyan-100" subtitle="Generados hoy" />
          <StatsCard title="Pendientes" value={data.pendingOrders} icon={ClipboardList} iconColor="text-yellow-600" iconBg="bg-yellow-100" subtitle="Ítems por entregar" />
          <StatsCard title="Consumos de hoy" value={data.todayConsumptions} icon={UtensilsCrossed} iconColor="text-emerald-600" iconBg="bg-emerald-100" subtitle="Registrados" />
          <StatsCard title="Estudiantes activos" value={data.activeStudents} icon={Users} iconColor="text-violet-600" iconBg="bg-violet-100" subtitle="Disponibles" />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <StatsCard title="Ventas del mes" value={formatCurrency(data.monthlySales)} icon={TrendingUp} iconColor="text-orange-600" iconBg="bg-orange-100" subtitle="Pedidos acumulados" />
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Busqueda rapida</p>
              <p className="text-xs text-slate-500 mt-1">Localiza estudiantes y registra consumos desde la seccion de busqueda.</p>
            </div>
            <Link href="/vendor/search" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-600">
              <Search className="w-4 h-4" />
              Buscar
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Pedidos Recientes</h2>
            <Link href="/vendor/orders" className="text-xs text-cyan-600 font-semibold">Ver todos →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {data.recentOrders.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-sm">No hay pedidos hoy</p>
            ) : data.recentOrders.map((order) => (
              <div key={order.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{order.parent.name}</p>
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
  );
}

