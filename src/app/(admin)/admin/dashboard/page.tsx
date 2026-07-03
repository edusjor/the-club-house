import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  Users,
  GraduationCap,
  ShoppingCart,
  CreditCard,
  UtensilsCrossed,
  Package,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const [
    totalUsers,
    totalStudents,
    pendingPayments,
    pendingPaymentsSum,
    todayOrders,
    activePackages,
    recentPayments,
    recentOrders,
    monthlyRevenue,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.student.count({ where: { active: true } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.studentPackage.count({ where: { status: "ACTIVE" } }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { parent: { select: { name: true } } },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        parent: { select: { name: true } },
        items: { include: { student: true, foodItem: true } },
      },
    }),
    prisma.payment.aggregate({
      where: {
        status: "APPROVED",
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amount: true },
    }),
  ]);

  return {
    totalUsers,
    totalStudents,
    pendingPayments,
    pendingPaymentsSum: pendingPaymentsSum._sum.amount ?? 0,
    todayOrders,
    activePackages,
    recentPayments,
    recentOrders,
    monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
  };
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Resumen general del sistema The Club House"
      />

      <div className="p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatsCard
            title="Padres registrados"
            value={data.totalUsers}
            icon={Users}
            iconColor="text-cyan-600"
            iconBg="bg-cyan-100"
            subtitle="Cuentas activas"
          />
          <StatsCard
            title="Estudiantes activos"
            value={data.totalStudents}
            icon={GraduationCap}
            iconColor="text-violet-600"
            iconBg="bg-violet-100"
            subtitle="En el sistema"
          />
          <StatsCard
            title="Pedidos de hoy"
            value={data.todayOrders}
            icon={ShoppingCart}
            iconColor="text-orange-600"
            iconBg="bg-orange-100"
            subtitle="Generados hoy"
          />
          <StatsCard
            title="Paquetes activos"
            value={data.activePackages}
            icon={Package}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
            subtitle="Vigentes"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <StatsCard
            title="Pagos pendientes"
            value={data.pendingPayments}
            icon={AlertCircle}
            iconColor="text-yellow-600"
            iconBg="bg-yellow-100"
            subtitle={`${formatCurrency(data.pendingPaymentsSum)} por revisar`}
          />
          <StatsCard
            title="Recaudación del mes"
            value={formatCurrency(data.monthlyRevenue)}
            icon={TrendingUp}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-100"
            subtitle="Pagos aprobados"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pagos recientes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Pagos Recientes</h2>
              <Link
                href="/admin/payments"
                className="text-xs text-cyan-600 font-semibold hover:text-cyan-500"
              >
                Ver todos →
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentPayments.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">
                  Sin pagos recientes
                </p>
              ) : (
                data.recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-4 h-4 text-cyan-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {p.parent.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(p.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(p.amount)}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pedidos recientes */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Pedidos Recientes</h2>
              <Link
                href="/admin/orders"
                className="text-xs text-cyan-600 font-semibold hover:text-cyan-500"
              >
                Ver todos →
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {data.recentOrders.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">
                  Sin pedidos recientes
                </p>
              ) : (
                data.recentOrders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <ShoppingCart className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {o.parent.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {o.items.length} ítem(s) · {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(o.total)}
                      </p>
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="font-bold text-slate-900 mb-4">Accesos Rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { href: "/admin/users", label: "Nuevo Usuario", icon: Users, color: "bg-cyan-50 hover:bg-cyan-100 text-cyan-700" },
              { href: "/admin/students", label: "Ver Estudiantes", icon: GraduationCap, color: "bg-violet-50 hover:bg-violet-100 text-violet-700" },
              { href: "/admin/menu", label: "Agregar Comida", icon: UtensilsCrossed, color: "bg-orange-50 hover:bg-orange-100 text-orange-700" },
              { href: "/admin/packages", label: "Crear Paquete", icon: Package, color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
              { href: "/admin/payments", label: "Revisar Pagos", icon: CreditCard, color: "bg-yellow-50 hover:bg-yellow-100 text-yellow-700" },
              { href: "/admin/reports", label: "Ver Reportes", icon: TrendingUp, color: "bg-rose-50 hover:bg-rose-100 text-rose-700" },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-100 transition-colors ${a.color}`}
              >
                <a.icon className="w-6 h-6" />
                <span className="text-xs font-semibold text-center leading-tight">
                  {a.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

