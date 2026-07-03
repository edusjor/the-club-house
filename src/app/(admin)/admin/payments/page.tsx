"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatReceiptSummary, parsePaymentReceipt } from "@/lib/payment-receipt";
import { Search, Check, X } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  status: string;
  receipt?: string | null;
  comment?: string | null;
  createdAt: string;
  parent?: { name: string; email: string };
  order?: { id: string; total: number };
};

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => axios.get("/api/payments").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, comment }: { id: string; status: string; comment?: string }) => axios.put(`/api/payments/${id}`, { status, comment }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((payment) => {
      const text = `${payment.parent?.name ?? ""} ${payment.parent?.email ?? ""} ${payment.receipt ?? ""}`.toLowerCase();
      return (q === "" || text.includes(q)) && (statusFilter === "ALL" || payment.status === statusFilter);
    });
  }, [payments, search, statusFilter]);

  const handleDecision = (paymentId: string, status: string) => {
    const comment = window.prompt(status === "APPROVED" ? "Comentario opcional" : "Motivo del rechazo (opcional)") ?? undefined;
    updateMutation.mutate({ id: paymentId, status, comment: comment || undefined });
  };

  return (
    <div>
      <Header title="Pagos" subtitle="Aprueba o rechaza comprobantes" />
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pago, padre o comprobante..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendientes</option>
            <option value="APPROVED">Aprobados</option>
            <option value="REJECTED">Rechazados</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-slate-400">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">No hay pagos</div>
          ) : filtered.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {(() => {
                const receipt = parsePaymentReceipt(payment.receipt);

                return (
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">{payment.parent?.name ?? "Padre"}</h3>
                  <p className="text-sm text-slate-500">{payment.parent?.email ?? ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(payment.createdAt)}</p>
                  {receipt?.kind === "UPLOAD" ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Comprobante: {formatReceiptSummary(payment.receipt)} ·{" "}
                      <a
                        href={receipt.dataUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        Ver archivo
                      </a>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      Comprobante: {receipt?.reference ?? "Sin archivo"}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-slate-900">{formatCurrency(payment.amount)}</div>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
                );
              })()}

              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => handleDecision(payment.id, "APPROVED")} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="h-4 w-4" />Aprobar</button>
                <button onClick={() => handleDecision(payment.id, "REJECTED")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><X className="h-4 w-4" />Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}