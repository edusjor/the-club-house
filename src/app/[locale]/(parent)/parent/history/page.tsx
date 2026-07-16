"use client";

import Image from "next/image";
import Link from "@/i18n/Link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate, formatDateTime, formatOrderNumber } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Sparkles,
  Store,
  XCircle,
} from "lucide-react";

function formatWeekdayTime(date: Date) {
  const weekday = new Intl.DateTimeFormat("es-CR", { weekday: "long" }).format(date);
  const time = new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit" }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${time}`;
}

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  delivered: boolean;
  scheduledDate: string;
  student: { name: string };
  foodItem: { name: string; image?: string | null };
};

type Order = {
  id: string;
  status: string;
  total: number;
  source: string;
  createdAt: string;
  parentCanCancel?: boolean;
  parentCancellationDeadline?: string | null;
  items: OrderItem[];
  payments: { id: string; status: string; amount: number }[];
};

type NonDispatchedOrder = {
  id: string;
  status: string;
  total: number;
  source: string;
  createdAt: string;
  items: OrderItem[];
  earliestScheduledDate: Date;
  cancellationDeadline: Date;
  canCancel: boolean;
};

type DispatchedOrder = {
  id: string;
  status: string;
  total: number;
  source: string;
  createdAt: string;
  items: OrderItem[];
  latestScheduledDate: Date;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const HISTORY_STATUSES = new Set(["PAID", "PREPARING"]);
const DISPATCHED_STATUSES = new Set(["DELIVERED", "NOT_PICKED_UP"]);
const SOURCE_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "PARENT", label: "Hecho por el padre" },
  { value: "VENDOR", label: "Hecho en el restaurante" },
] as const;

function ParentHistoryContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const justCreated = searchParams.get("created") === "1";
  const createdTotal = Number(searchParams.get("total") ?? 0);
  const highlightedOrderIds = useMemo(
    () => new Set((searchParams.get("ids") ?? "").split(",").filter(Boolean)),
    [searchParams]
  );
  const [dismissedBanner, setDismissedBanner] = useState(false);

  const [activeTab, setActiveTab] = useState<"not-dispatched" | "dispatched">("not-dispatched");
  const [sortMode, setSortMode] = useState<"created" | "scheduled">(
    justCreated ? "created" : "scheduled"
  );
  const [dispatchedSourceFilter, setDispatchedSourceFilter] = useState<"all" | "PARENT" | "VENDOR">("all");

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["parent-orders"],
    queryFn: () => axios.get("/api/orders").then((response) => response.data),
  });

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
          source: order.source,
          createdAt: order.createdAt,
          items: order.items,
          earliestScheduledDate,
          cancellationDeadline,
          canCancel: Boolean(order.parentCanCancel),
        };
      })
      .sort((a, b) =>
        sortMode === "created"
          ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          : a.earliestScheduledDate.getTime() - b.earliestScheduledDate.getTime()
      );
  }, [orders, sortMode]);

  const dispatchedOrders = useMemo<DispatchedOrder[]>(() => {
    return orders
      .filter((order) => DISPATCHED_STATUSES.has(order.status) && order.items.length > 0)
      .filter((order) => dispatchedSourceFilter === "all" || order.source === dispatchedSourceFilter)
      .map((order) => {
        const latestScheduledDate = order.items
          .map((item) => new Date(item.scheduledDate))
          .sort((a, b) => b.getTime() - a.getTime())[0];

        return {
          id: order.id,
          status: order.status,
          total: order.total,
          source: order.source,
          createdAt: order.createdAt,
          items: order.items,
          latestScheduledDate,
        };
      })
      .sort((a, b) => b.latestScheduledDate.getTime() - a.latestScheduledDate.getTime());
  }, [orders, dispatchedSourceFilter]);

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
      `¿Cancelar el pedido #${formatOrderNumber(order.id)}? Esta acción no se puede deshacer.`
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
        subtitle="Separa tus pedidos no despachados de los despachados"
      />

      <div className="space-y-6 p-6">
        {justCreated && !dismissedBanner ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              Orden creada — se sumaron {formatCurrency(createdTotal)} a tu saldo
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/parent/plan"
                className="inline-flex h-9 items-center rounded-lg border border-emerald-300 bg-white px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Pedir otra comida
              </Link>
              <Link
                href="/parent/balance"
                className="inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Ver saldo
              </Link>
              <button
                type="button"
                onClick={() => setDismissedBanner(true)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                aria-label="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

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

        <div className="flex items-center gap-1.5 px-1 text-xs text-slate-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Puedes cancelar un pedido hasta 2 horas antes de la hora programada.
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("not-dispatched")}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "not-dispatched"
                ? "border-b-2 border-cyan-500 text-cyan-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Clock3 className="mr-2 inline h-4 w-4" />
            No despachados
          </button>
          <button
            onClick={() => setActiveTab("dispatched")}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "dispatched"
                ? "border-b-2 border-cyan-500 text-cyan-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <History className="mr-2 inline h-4 w-4" />
            Despachados
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "dispatched" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-500">Filtrar por origen</p>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                {SOURCE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setDispatchedSourceFilter(filter.value)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      dispatchedSourceFilter === filter.value ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {ordersLoading ? (
              <div className="text-sm text-slate-500">Cargando pedidos...</div>
            ) : dispatchedOrders.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay pedidos despachados.</p>
            ) : (
              <div className="space-y-3">
                {dispatchedOrders.map((order) => {
                  const studentName = order.items[0]?.student.name ?? "Sin estudiante asignado";

                  return (
                    <div key={order.id} className="rounded-xl border border-slate-200 bg-white pl-5 pr-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              Pedido #{formatOrderNumber(order.id)}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs font-semibold text-slate-500">{studentName}</span>
                            {order.source === "VENDOR" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                <Store className="h-3 w-3" />
                                Hecho en el restaurante
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-center gap-1.5">
                            <CalendarDays className="h-5 w-5 text-blue-600" />
                            <span className="text-xl font-black leading-none text-slate-900">
                              {formatDate(order.latestScheduledDate)}
                            </span>
                          </div>
                          <p className="ml-[26px] text-xs text-slate-500">
                            {formatWeekdayTime(order.latestScheduledDate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Total del pedido
                          </span>
                          <p className="mt-1 text-2xl font-black text-blue-600">{formatCurrency(order.total)}</p>
                        </div>
                      </div>

                      <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 py-2.5">
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                              {item.foodItem.image ? (
                                <Image
                                  src={item.foodItem.image}
                                  alt={item.foodItem.name}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center text-sm">🍽️</span>
                              )}
                            </div>
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                              {item.foodItem.name}
                            </p>
                            <span className="shrink-0 text-sm font-bold text-slate-700">
                              {formatCurrency(item.price * (item.quantity > 0 ? item.quantity : 1))}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Clock3 className="h-3.5 w-3.5" />
                          Creado el: {formatDateTime(order.createdAt)}
                        </span>

                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-slate-500">Ordenar por</p>
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setSortMode("created")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    sortMode === "created" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Pedidos recientes
                </button>
                <button
                  type="button"
                  onClick={() => setSortMode("scheduled")}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    sortMode === "scheduled" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  Próximos a despachar
                </button>
              </div>
            </div>

            {ordersLoading ? (
              <div className="text-sm text-slate-500">Cargando pedidos...</div>
            ) : nonDispatchedOrders.length === 0 ? (
              <p className="text-sm text-slate-500">No tienes pedidos en espera de despacho.</p>
            ) : (
              <div className="space-y-3">
                {nonDispatchedOrders.map((order) => {
                  const isNew = highlightedOrderIds.has(order.id);
                  const studentName = order.items[0]?.student.name ?? "Sin estudiante asignado";

                  return (
                  <div
                    key={order.id}
                    className={`rounded-xl border pl-5 pr-4 py-4 ${
                      isNew
                        ? "border-cyan-300 bg-cyan-50 ring-1 ring-cyan-200"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Pedido #{formatOrderNumber(order.id)}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-semibold text-slate-500">{studentName}</span>
                          {isNew ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              <Sparkles className="h-3 w-3" />
                              Nuevo
                            </span>
                          ) : null}
                          {order.source === "VENDOR" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              <Store className="h-3 w-3" />
                              Hecho en el restaurante
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <CalendarDays className="h-5 w-5 text-blue-600" />
                          <span className="text-xl font-black leading-none text-slate-900">
                            {formatDate(order.earliestScheduledDate)}
                          </span>
                        </div>
                        <p className="ml-[26px] text-xs text-slate-500">
                          {formatWeekdayTime(order.earliestScheduledDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          Total del pedido
                        </span>
                        <p className="mt-1 text-2xl font-black text-blue-600">{formatCurrency(order.total)}</p>
                      </div>
                    </div>

                    <div className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 py-2.5">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                            {item.foodItem.image ? (
                              <Image
                                src={item.foodItem.image}
                                alt={item.foodItem.name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center text-sm">🍽️</span>
                            )}
                          </div>
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                            {item.foodItem.name}
                          </p>
                          <span className="shrink-0 text-sm font-bold text-slate-700">
                            {formatCurrency(item.price * (item.quantity > 0 ? item.quantity : 1))}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        Creado el: {formatDateTime(order.createdAt)}
                      </span>

                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={!order.canCancel || cancelMutation.isPending}
                        title={
                          order.canCancel
                            ? undefined
                            : "Ya no se puede cancelar: está dentro de la ventana de 2 horas."
                        }
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 px-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancelar pedido
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ParentHistoryLoading() {
  return (
    <div>
      <Header
        title="Historial y Seguimiento"
        subtitle="Separa tus pedidos no despachados de los despachados"
      />
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando historial...
        </div>
      </div>
    </div>
  );
}

export default function ParentHistoryPage() {
  return (
    <Suspense fallback={<ParentHistoryLoading />}>
      <ParentHistoryContent />
    </Suspense>
  );
}
