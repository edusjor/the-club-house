"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Clock3, History, ShieldCheck, XCircle } from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  delivered: boolean;
  scheduledDate: string;
  student: { name: string };
  foodItem: { name: string };
};

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  parentCanCancel?: boolean;
  parentCancellationDeadline?: string | null;
  items: OrderItem[];
  payments: { id: string; status: string; amount: number }[];
};

type Consumption = {
  id: string;
  consumedAt: string;
  notes?: string | null;
  student: { name: string };
  foodItem: { name: string };
  registeredBy: { name: string };
};

type NonDispatchedOrder = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
  earliestScheduledDate: Date;
  cancellationDeadline: Date;
  canCancel: boolean;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const HISTORY_STATUSES = new Set(["PAID", "PREPARING"]);

export default function ParentHistoryPage() {
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["parent-orders"],
    queryFn: () => axios.get("/api/orders").then((response) => response.data),
  });

  const { data: consumptions = [], isLoading: consumptionsLoading } = useQuery<Consumption[]>({
    queryKey: ["parent-consumptions"],
    queryFn: () => axios.get("/api/consumptions").then((response) => response.data),
  });

  const pendingPaymentReview = useMemo(() => {
    return orders
      .map((order) => {
        const approvedAmount = order.payments
          .filter((payment) => payment.status === "APPROVED")
          .reduce((sum, payment) => sum + payment.amount, 0);

        return {
          ...order,
          pendingAmount: Math.max(0, order.total - approvedAmount),
        };
      })
      .filter((order) => order.status === "PENDING" && order.pendingAmount > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const nonDispatchedOrders = useMemo<NonDispatchedOrder[]>(() => {
    return orders
      .filter((order) => HISTORY_STATUSES.has(order.status))
      .filter((order) => order.items.length > 0 && order.items.every((item) => !item.delivered))
      .map((order) => {
        const earliestScheduledDate = order.items
          .map((item) => new Date(item.scheduledDate))
          .sort((a, b) => a.getTime() - b.getTime())[0];

        const cancellationDeadline = order.parentCancellationDeadline
          ? new Date(order.parentCancellationDeadline)
          : new Date(earliestScheduledDate.getTime() - TWO_HOURS_MS);

        return {
          id: order.id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          items: order.items,
          earliestScheduledDate,
          cancellationDeadline,
          canCancel: Boolean(order.parentCanCancel),
        };
      })
      .sort(
        (a, b) => a.earliestScheduledDate.getTime() - b.earliestScheduledDate.getTime()
      );
  }, [orders]);

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) =>
      axios.put(`/api/orders/${orderId}`, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      setError("");
      setFeedback("Pedido cancelado correctamente.");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo cancelar el pedido";
      setFeedback("");
      setError(message);
    },
  });

  const handleCancelOrder = (order: NonDispatchedOrder) => {
    if (!order.canCancel) {
      setFeedback("");
      setError("Este pedido ya está dentro de la ventana de 2 horas y no puede cancelarse.");
      return;
    }

    const accepted = window.confirm(
      `¿Cancelar el pedido ${order.id.slice(0, 8)}? Esta acción no se puede deshacer.`
    );

    if (!accepted) return;

    setFeedback("");
    setError("");
    cancelMutation.mutate(order.id);
  };

  return (
    <div>
      <Header
        title="Historial y Seguimiento"
        subtitle="Separa tus pedidos no despachados de los consumidos"
      />

      <div className="space-y-6 p-6">
        {feedback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {feedback}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-cyan-600" />
            Pendientes de aprobación de pago
          </div>

          {ordersLoading ? (
            <div className="text-sm text-slate-500">Cargando pedidos...</div>
          ) : pendingPaymentReview.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes pedidos esperando aprobación de pago.</p>
          ) : (
            <div className="space-y-3">
              {pendingPaymentReview.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-slate-900">Pedido #{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{formatCurrency(order.pendingAmount)}</div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4">
            <Link
              href="/parent/payments"
              className="inline-flex h-10 items-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600"
            >
              Ir a pagar
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Clock3 className="h-4 w-4 text-orange-600" />
            No despachados (cancelables hasta 2 horas antes)
          </div>

          {ordersLoading ? (
            <div className="text-sm text-slate-500">Cargando pedidos...</div>
          ) : nonDispatchedOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes pedidos en espera de despacho.</p>
          ) : (
            <div className="space-y-4">
              {nonDispatchedOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">Pedido #{order.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">
                        Creado: {formatDateTime(order.createdAt)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Primer horario: {formatDateTime(order.earliestScheduledDate)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Límite para cancelar: {formatDateTime(order.cancellationDeadline)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{formatCurrency(order.total)}</div>
                      <StatusBadge status={order.status} />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-white px-3 py-2">
                        <div className="font-medium text-slate-900">{item.foodItem.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.student.name} · {item.quantity} x {formatCurrency(item.price)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Programado: {formatDateTime(item.scheduledDate)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      {order.canCancel
                        ? "Puedes cancelar este pedido porque aún faltan más de 2 horas."
                        : "Este pedido ya está dentro de la ventana de 2 horas y no puede cancelarse."}
                    </p>

                    <button
                      onClick={() => handleCancelOrder(order)}
                      disabled={!order.canCancel || cancelMutation.isPending}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar pedido
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <History className="h-4 w-4 text-emerald-600" />
            Consumidos
          </div>

          {consumptionsLoading ? (
            <div className="text-sm text-slate-500">Cargando consumos...</div>
          ) : consumptions.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no hay consumos registrados.</p>
          ) : (
            <div className="space-y-3">
              {consumptions.map((consumption) => (
                <div key={consumption.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{consumption.foodItem.name}</div>
                      <div className="text-xs text-slate-500">
                        {consumption.student.name} · {formatDateTime(consumption.consumedAt)}
                      </div>
                      <div className="text-xs text-slate-500">
                        Registrado por: {consumption.registeredBy.name}
                      </div>
                      {consumption.notes ? (
                        <div className="text-xs text-slate-500">Nota: {consumption.notes}</div>
                      ) : null}
                    </div>
                    <StatusBadge status="DELIVERED" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
