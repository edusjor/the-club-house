import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function ParentStatementsPage() {
  const session = await auth();
  const parentId = (session?.user as { id?: string } | undefined)?.id;
  if (!parentId) redirect("/login");

  const [orders, payments, consumptions] = await Promise.all([
    prisma.order.aggregate({ where: { parentId }, _sum: { total: true }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { parentId, status: "APPROVED" }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.consumption.count({ where: { student: { parentId } } }),
  ]);

  return (
    <div>
      <Header title="Estados de Cuenta" subtitle="Resumen consolidado de saldos y consumos" />
      <div className="p-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">Pedidos</div><div className="mt-1 text-2xl font-black text-slate-900">{orders._count._all}</div><div className="text-sm text-slate-500">{formatCurrency(orders._sum.total ?? 0)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">Pagos aprobados</div><div className="mt-1 text-2xl font-black text-slate-900">{payments._count._all}</div><div className="text-sm text-slate-500">{formatCurrency(payments._sum.amount ?? 0)}</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">Consumos</div><div className="mt-1 text-2xl font-black text-slate-900">{consumptions}</div></div>
      </div>
    </div>
  );
}