import Header from "@/components/dashboard/Header";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";

async function getSettingsSummary() {
  const [activeParents, activeStudents, activeVendors, pendingPayments, pendingOrders] =
    await Promise.all([
      prisma.user.count({ where: { role: "PARENT", active: true } }),
      prisma.student.count({ where: { active: true } }),
      prisma.user.count({ where: { role: "VENDOR", active: true } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "PENDING" } }),
    ]);

  return {
    activeParents,
    activeStudents,
    activeVendors,
    pendingPayments,
    pendingOrders,
    generatedAt: new Date(),
  };
}

export default async function AdminSettingsPage() {
  const summary = await getSettingsSummary();

  return (
    <div>
      <Header
        title="Configuración"
        subtitle="Parámetros operativos y salud general del sistema"
      />

      <div className="p-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Padres activos</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{summary.activeParents}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Estudiantes activos</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{summary.activeStudents}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Vendedores activos</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{summary.activeVendors}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Pagos por revisar</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{summary.pendingPayments}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Pedidos pendientes</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{summary.pendingOrders}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Reglas operativas activas</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              Solo los roles autorizados acceden por proxy a rutas privadas.
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              Registro de consumo valida cobertura: pedido, paquete o cargo por pagar.
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              Los pedidos se valoran en servidor según nivel del estudiante.
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              La aprobación de pagos sincroniza automáticamente estado de pedidos.
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-xs text-slate-500">
          Última actualización automática: {formatDateTime(summary.generatedAt)}
        </div>
      </div>
    </div>
  );
}