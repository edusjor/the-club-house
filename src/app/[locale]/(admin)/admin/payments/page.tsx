"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ReceiptFileLink from "@/components/ReceiptFileLink";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatReceiptSummary, parsePaymentReceipt } from "@/lib/payment-receipt";
import { Search, Check, X, Save } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  status: string;
  receipt?: string | null;
  comment?: string | null;
  createdAt: string;
  parent?: {
    name: string;
    email: string;
    parentBalance?: { pendingBalance: number; creditBalance: number } | null;
  };
  order?: { id: string; total: number };
};

function PaymentCard({
  payment,
  onUpdate,
  isUpdating,
}: {
  payment: Payment;
  onUpdate: (data: { status?: string; amount?: number; comment?: string }) => void;
  isUpdating: boolean;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [comment, setComment] = useState(payment.comment ?? "");
  const receipt = parsePaymentReceipt(payment.receipt);

  const parsedAmount = Number(amount);
  const amountChanged = parsedAmount !== payment.amount;
  const commentChanged = comment !== (payment.comment ?? "");
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const pendingBalance = payment.parent?.parentBalance?.pendingBalance ?? 0;

  // `targetStatus` is undefined for a plain "Guardar cambios" — in that case
  // the payment's current status is what it'll stay at.
  const confirmIfNeeded = (targetStatus?: string) => {
    const willBeApproved = targetStatus ? targetStatus === "APPROVED" : payment.status === "APPROVED";
    const effectiveAmount = amountChanged ? parsedAmount : payment.amount;

    if (willBeApproved && effectiveAmount > pendingBalance) {
      const excess = effectiveAmount - pendingBalance;
      return window.confirm(
        `Este monto (${formatCurrency(effectiveAmount)}) es MAYOR al saldo pendiente actual del padre (${formatCurrency(pendingBalance)}).\n\nSe va a aprobar por más de lo que debe. El excedente de ${formatCurrency(excess)} quedará registrado como saldo a favor del padre, para futuros pedidos.\n\n¿Continuar?`
      );
    }

    if (amountChanged && payment.status === "APPROVED") {
      return window.confirm(
        `Este pago ya está aprobado. Cambiar el monto de ${formatCurrency(payment.amount)} a ${formatCurrency(parsedAmount)} ajustará el saldo del padre. ¿Continuar?`
      );
    }

    return true;
  };

  const handleSave = () => {
    if (!amountValid || !confirmIfNeeded()) return;
    onUpdate({
      amount: amountChanged ? parsedAmount : undefined,
      comment: commentChanged ? comment : undefined,
    });
  };

  const handleDecision = (status: string) => {
    if (!amountValid || !confirmIfNeeded(status)) return;
    onUpdate({
      status,
      amount: amountChanged ? parsedAmount : undefined,
      comment: commentChanged ? comment : undefined,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900">{payment.parent?.name ?? "Padre"}</h3>
          <p className="text-sm text-slate-500">{payment.parent?.email ?? ""}</p>
          <p className="mt-1 text-xs text-slate-500">
            Saldo pendiente: <span className="font-semibold text-slate-700">{formatCurrency(pendingBalance)}</span>
            {payment.parent?.parentBalance?.creditBalance ? (
              <span className="ml-2 font-semibold text-emerald-600">
                · Saldo a favor: {formatCurrency(payment.parent.parentBalance.creditBalance)}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(payment.createdAt)}</p>
          {receipt?.kind === "UPLOAD" ? (
            <p className="mt-2 text-xs text-slate-500">
              Comprobante: {formatReceiptSummary(payment.receipt)} ·{" "}
              <ReceiptFileLink dataUrl={receipt.dataUrl} className="font-semibold text-cyan-700 hover:text-cyan-800">
                Ver archivo
              </ReceiptFileLink>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Comprobante: {receipt?.reference ?? "Sin archivo"}</p>
          )}
        </div>
        <StatusBadge status={payment.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Monto</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">Notas para el padre (visibles en su saldo)</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ej: se ajustó el monto según el comprobante"
            className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleSave}
          disabled={isUpdating || !amountValid || (!amountChanged && !commentChanged)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Guardar cambios
        </button>
        <button
          onClick={() => handleDecision("APPROVED")}
          disabled={isUpdating || !amountValid || payment.status === "APPROVED"}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Aprobar
        </button>
        <button
          onClick={() => handleDecision("REJECTED")}
          disabled={isUpdating || !amountValid || payment.status === "REJECTED"}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Rechazar
        </button>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["payments"],
    queryFn: () => axios.get("/api/payments").then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string; amount?: number; comment?: string }) =>
      axios.put(`/api/payments/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
    onError: (error: unknown) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : "No se pudo actualizar el pago";
      alert(message);
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return payments.filter((payment) => {
      const text = `${payment.parent?.name ?? ""} ${payment.parent?.email ?? ""} ${payment.receipt ?? ""}`.toLowerCase();
      return (q === "" || text.includes(q)) && (statusFilter === "ALL" || payment.status === statusFilter);
    });
  }, [payments, search, statusFilter]);

  return (
    <div>
      <Header title="Pagos" subtitle="Aprueba, rechaza o corrige comprobantes" />
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
            <PaymentCard
              key={payment.id}
              payment={payment}
              isUpdating={updateMutation.isPending && updateMutation.variables?.id === payment.id}
              onUpdate={(data) => updateMutation.mutate({ id: payment.id, ...data })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
