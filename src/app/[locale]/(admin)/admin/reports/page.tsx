import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { BarChart3, CreditCard, Package, ShoppingCart, TrendingUp, Users } from "lucide-react";

async function getData() {
  const [parents, students, payments, orders, activePackages, monthlyRevenue, recentPayments] = await prisma.$transaction([
    prisma.user.count({ where: { role: "PARENT" } }),
    prisma.student.count(),
    prisma.payment.count(),
    prisma.order.count(),
    prisma.studentPackage.count({ where: { status: "ACTIVE" } }),
    prisma.payment.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    prisma.payment.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { parent: { select: { name: true } } } }),
  ]);

  return { parents, students, payments, orders, activePackages, monthlyRevenue: monthlyRevenue._sum.amount ?? 0, recentPayments };
}

export default async function AdminReportsPage() {
  const data = await getData();

  return (
    <div>
      <Header title="Reportes" subtitle="Resumen ejecutivo del sistema" />
      <div className="p-6 space-y-6">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <StatsCard title="Padres" value={data.parents} icon={Users} iconColor="text-cyan-600" iconBg="bg-cyan-100" subtitle="Cuentas familiares" />
          <StatsCard title="Estudiantes" value={data.students} icon={BarChart3} iconColor="text-violet-600" iconBg="bg-violet-100" subtitle="Registrados" />
          <StatsCard title="Pedidos" value={data.orders} icon={ShoppingCart} iconColor="text-orange-600" iconBg="bg-orange-100" subtitle="Totales" />
          <StatsCard title="Pagos" value={data.payments} icon={CreditCard} iconColor="text-emerald-600" iconBg="bg-emerald-100" subtitle="Movimientos" />
          <StatsCard title="Paquetes activos" value={data.activePackages} icon={Package} iconColor="text-cyan-600" iconBg="bg-cyan-100" subtitle="Vigentes" />
          <StatsCard title="Recaudación" value={formatCurrency(data.monthlyRevenue)} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-100" subtitle="Aprobados" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 font-bold text-slate-900">Pagos recientes</div>
          <div className="divide-y divide-slate-50">
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="font-semibold text-slate-900">{payment.parent.name}</div>
                  <div className="text-xs text-slate-500">{formatDateTime(payment.createdAt)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</div>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
