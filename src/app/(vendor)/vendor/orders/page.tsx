import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

type VendorOrdersPageProps = {
  searchParams?: Promise<{ date?: string }>;
};

function parseDayParam(dayParam?: string) {
  if (!dayParam || !/^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
    return new Date();
  }

  const [year, month, day] = dayParam.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start, end };
}

async function getOrders(dayParam?: string) {
  const selectedDate = parseDayParam(dayParam);
  const { start, end } = getDayBounds(selectedDate);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "PREPARING", "DELIVERED"] },
      items: {
        some: {
          scheduledDate: { gte: start, lte: end },
        },
      },
    },
    include: {
      parent: { select: { name: true } },
      items: {
        where: { scheduledDate: { gte: start, lte: end } },
        include: { student: true, foodItem: true },
        orderBy: { scheduledDate: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    orders,
    selectedDate,
  };
}

export default async function VendorOrdersPage({ searchParams }: VendorOrdersPageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const { orders, selectedDate } = await getOrders(resolvedParams?.date);
  const selectedDateValue = toDateInputValue(selectedDate);

  return (
    <div>
      <Header
        title="Pedidos por Fecha"
        subtitle={`Programación para cocina y despacho del ${formatDate(selectedDate)}`}
      />
      <div className="p-6 space-y-4">
        <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700" htmlFor="vendor-orders-date">
            Fecha operativa
          </label>
          <input
            id="vendor-orders-date"
            name="date"
            type="date"
            defaultValue={selectedDateValue}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600">
            Ver pedidos
          </button>
        </form>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No hay pedidos programados para esta fecha.
          </div>
        ) : null}

        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{order.parent.name}</div>
                <div className="text-xs text-slate-500">{formatDateTime(order.createdAt)} · {order.items.length} item(s)</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{formatCurrency(order.total)}</div>
                <StatusBadge status={order.status} />
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 text-sm text-slate-600">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3">
                  <div className="font-medium text-slate-900">{item.student.name} · {item.foodItem.name}</div>
                  <div className="text-xs text-slate-500">
                    {item.delivered ? "Entregado" : "Pendiente"} · {formatDateTime(item.scheduledDate)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}