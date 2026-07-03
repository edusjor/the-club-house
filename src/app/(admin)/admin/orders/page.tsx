"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, CheckCircle, Clock3, PackageOpen } from "lucide-react";

type Order = {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  parent?: { name: string; email: string };
  items: { id: string; quantity: number; price: number; student: { name: string }; foodItem: { name: string; category: { name: string } } }[];
};

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: () => axios.get("/api/orders").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.put(`/api/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((order) => {
      const parentMatch = (order.parent?.name ?? "").toLowerCase().includes(q) || (order.parent?.email ?? "").toLowerCase().includes(q);
      const itemMatch = order.items.some((item) => item.foodItem.name.toLowerCase().includes(q) || item.student.name.toLowerCase().includes(q));
      const statusMatch = statusFilter === "ALL" || order.status === statusFilter;
      return (q === "" || parentMatch || itemMatch) && statusMatch;
    });
  }, [orders, search, statusFilter]);

  return (
    <div>
      <Header title="Pedidos" subtitle="Supervisa y cambia estados de pedidos" />
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pedido o padre..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="PAID">Pagados</option>
            <option value="PREPARING">En preparación</option>
            <option value="DELIVERED">Entregados</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">No hay pedidos</div>
          ) : filtered.map((order) => (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-cyan-600" />
                    <h3 className="font-bold text-slate-900">Pedido #{order.id.slice(0, 8)}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{order.parent?.name ?? "Sin padre"} · {order.parent?.email ?? ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">{formatCurrency(order.total)}</div>
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3">
                    <div className="font-semibold">{item.foodItem.name}</div>
                    <div className="text-xs text-slate-500">{item.student.name} · {item.quantity} x {formatCurrency(item.price)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => updateMutation.mutate({ id: order.id, status: "PENDING" })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Clock3 className="h-4 w-4" />Pendiente</button>
                <button onClick={() => updateMutation.mutate({ id: order.id, status: "PREPARING" })} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 px-3 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50">En preparación</button>
                <button onClick={() => updateMutation.mutate({ id: order.id, status: "DELIVERED" })} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><CheckCircle className="h-4 w-4" />Entregado</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
