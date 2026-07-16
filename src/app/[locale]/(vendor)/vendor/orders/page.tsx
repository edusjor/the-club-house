"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate, formatOrderNumber } from "@/lib/utils";
import { CalendarDays, CheckCircle2, ChefHat, Clock3, Search, Store, XCircle } from "lucide-react";

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
  createdBy?: { name: string; role: string } | null;
  parent: { name: string };
  items: OrderItem[];
};

const EMPTY_ORDERS: Order[] = [];
const TERMINAL_STATUSES = new Set(["DELIVERED", "NOT_PICKED_UP", "CANCELLED"]);

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function VendorOrdersPage() {
  const queryClient = useQueryClient();
  const [dateValue, setDateValue] = useState(() => toDateInputValue(new Date()));
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["vendor-orders", dateValue],
    queryFn: () => axios.get(`/api/orders?date=${dateValue}`).then((response) => response.data),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      axios.put(`/api/orders/${orderId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders", dateValue] });
      setError("");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo actualizar el pedido";
      setError(message);
    },
  });

  const ordersWithTime = useMemo(() => {
    return orders
      .map((order) => ({
        ...order,
        time: order.items[0] ? new Date(order.items[0].scheduledDate) : null,
      }))
      .filter((order) => order.time)
      .sort((a, b) => a.time!.getTime() - b.time!.getTime());
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = normalizeToken(search.trim());
    if (!normalizedQuery) return ordersWithTime;

    return ordersWithTime.filter((order) =>
      order.items.some((item) => normalizeToken(item.student.name).includes(normalizedQuery)) ||
      normalizeToken(order.parent.name).includes(normalizedQuery)
    );
  }, [ordersWithTime, search]);

  const groupedByTime = useMemo(() => {
    const groups = new Map<string, typeof filteredOrders>();
    for (const order of filteredOrders) {
      const key = formatTime(order.time!);
      const existing = groups.get(key);
      if (existing) existing.push(order);
      else groups.set(key, [order]);
    }
    return [...groups.entries()];
  }, [filteredOrders]);

  const selectedDate = useMemo(() => {
    const [year, month, day] = dateValue.split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }, [dateValue]);

  return (
    <div>
      <Header
        title="Pedidos del Día"
        subtitle="Qué hay que cocinar, a qué hora, y quién ya lo recogió"
      />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">
            <span className="mb-1 block text-xs">Fecha operativa</span>
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            />
          </label>

          <label className="min-w-60 flex-1 text-sm font-semibold text-slate-700">
            <span className="mb-1 block text-xs">Buscar por nombre</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre del estudiante o padre..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm"
              />
            </div>
          </label>

          <span className="text-xs font-semibold text-slate-500">{formatDate(selectedDate)}</span>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Cargando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            No hay pedidos para esta fecha.
          </div>
        ) : (
          groupedByTime.map(([time, timeOrders]) => (
            <div key={time} className="space-y-2">
              <div className="flex items-center gap-2 pl-1">
                <Clock3 className="h-4 w-4 text-cyan-600" />
                <h3 className="text-xl font-black text-slate-900">{time}</h3>
                <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700">
                  {timeOrders.length} pedido(s)
                </span>
              </div>

              {timeOrders.map((order) => {
                const isVendorOrder = order.source === "VENDOR";
                const canAct = !TERMINAL_STATUSES.has(order.status);
                const canStartPreparing = order.status === "PAID";
                const studentNames = [...new Set(order.items.map((item) => item.student.name))];

                return (
                  <div key={order.id} className="rounded-xl border border-slate-200 bg-white pl-5 pr-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            Pedido #{formatOrderNumber(order.id)}
                          </span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs font-semibold text-slate-500">
                            {studentNames.join(", ")}
                          </span>
                          {isVendorOrder ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              <Store className="h-3 w-3" />
                              Hecho en el restaurante
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <CalendarDays className="h-5 w-5 text-blue-600" />
                          <span className="text-xl font-black leading-none text-slate-900">
                            {formatDate(order.time!)}
                          </span>
                        </div>
                        <p className="ml-[26px] text-xs text-slate-500">
                          Padre/Madre: {order.parent.name}
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
                      <StatusBadge status={order.status} />

                      {canAct ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {canStartPreparing ? (
                            <button
                              onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "PREPARING" })}
                              disabled={updateStatusMutation.isPending}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ChefHat className="h-3.5 w-3.5" />
                              Preparando
                            </button>
                          ) : null}
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "NOT_PICKED_UP" })}
                            disabled={updateStatusMutation.isPending}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            No recogido
                          </button>
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: "DELIVERED" })}
                            disabled={updateStatusMutation.isPending}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Marcar entregado
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
