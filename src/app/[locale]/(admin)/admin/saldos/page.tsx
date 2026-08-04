"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search, Pencil, Wallet, AlertTriangle, TrendingUp } from "lucide-react";

type ParentBalanceRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  active: boolean;
  pendingBalance: number;
  approvedBalance: number;
  creditBalance: number;
  creditLimit: number;
  available: number;
  overLimitBy: number;
};

type AmountField = "pendingBalance" | "available" | "creditLimit";

const FIELD_OPTIONS: { value: AmountField; label: string }[] = [
  { value: "pendingBalance", label: "Gastado (pendiente)" },
  { value: "available", label: "Disponible" },
  { value: "creditLimit", label: "Límite" },
];

function EditLimitModal({
  balance,
  onClose,
  onSave,
  saving,
}: {
  balance: ParentBalanceRow;
  onClose: () => void;
  onSave: (creditLimit: number) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(String(balance.creditLimit));
  const parsed = Number(value);
  const isValid = value.trim() !== "" && Number.isInteger(parsed) && parsed >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Ajustar límite de crédito</h2>
          <p className="mt-0.5 text-sm text-slate-500">{balance.name} · {balance.email}</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Gastado actualmente: <span className="font-semibold text-slate-900">{formatCurrency(balance.pendingBalance)}</span>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-700">
              Nuevo límite (colones)
            </label>
            <input
              type="number"
              min={0}
              step={1000}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
            {!isValid && value.trim() !== "" ? (
              <p className="mt-1 text-xs text-red-600">Ingresa un número entero mayor o igual a 0</p>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!isValid || saving}
            onClick={() => onSave(parsed)}
            className="h-10 flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBalancesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [amountField, setAmountField] = useState<AmountField>("pendingBalance");
  const [operator, setOperator] = useState<"gte" | "lte">("gte");
  const [amountValue, setAmountValue] = useState("");
  const [editingBalance, setEditingBalance] = useState<ParentBalanceRow | null>(null);

  const { data: balances = [], isLoading } = useQuery<ParentBalanceRow[]>({
    queryKey: ["admin-balances"],
    queryFn: () => axios.get("/api/admin/balances").then((r) => r.data),
  });

  const updateLimitMutation = useMutation({
    mutationFn: ({ id, creditLimit }: { id: string; creditLimit: number }) =>
      axios.put(`/api/admin/balances/${id}`, { creditLimit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-balances"] });
      setEditingBalance(null);
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const numericValue = amountValue.trim() === "" ? null : Number(amountValue);

    return balances.filter((balance) => {
      const matchesSearch =
        q === "" || balance.name.toLowerCase().includes(q) || balance.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;

      if (numericValue === null || Number.isNaN(numericValue)) return true;
      const fieldValue = balance[amountField];
      return operator === "gte" ? fieldValue >= numericValue : fieldValue <= numericValue;
    });
  }, [balances, search, amountField, operator, amountValue]);

  const totalPending = useMemo(() => balances.reduce((sum, b) => sum + b.pendingBalance, 0), [balances]);
  const atOrOverLimitCount = useMemo(
    () => balances.filter((b) => b.available === 0).length,
    [balances]
  );

  return (
    <div>
      <Header title="Saldos" subtitle="Límite de crédito y saldo pendiente por usuario" />
      <div className="p-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Wallet className="h-4 w-4" /> Total pendiente
            </div>
            <div className="mt-1 text-3xl font-black text-slate-900">{formatCurrency(totalPending)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <AlertTriangle className="h-4 w-4" /> Al límite / sin cupo
            </div>
            <div className="mt-1 text-3xl font-black text-slate-900">{atOrOverLimitCount}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <TrendingUp className="h-4 w-4" /> Usuarios con saldo
            </div>
            <div className="mt-1 text-3xl font-black text-slate-900">{balances.length}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-60">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Buscar</label>
            <Search className="absolute left-3 top-[42px] h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre o email..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Campo</label>
            <select
              value={amountField}
              onChange={(e) => setAmountField(e.target.value as AmountField)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Condición</label>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as "gte" | "lte")}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="gte">Mayor o igual a</option>
              <option value="lte">Menor o igual a</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Monto</label>
            <input
              type="number"
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
              placeholder="0"
              className="h-10 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm"
            />
          </div>
          {amountValue.trim() !== "" ? (
            <button
              type="button"
              onClick={() => setAmountValue("")}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Limpiar filtro
            </button>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Padre/Madre</th>
                <th className="px-5 py-3 text-right">Límite</th>
                <th className="px-5 py-3 text-right">Gastado</th>
                <th className="px-5 py-3 text-right">Disponible</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td className="py-12 text-center text-slate-400" colSpan={6}>Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="py-12 text-center text-slate-400" colSpan={6}>No hay usuarios que coincidan con el filtro</td></tr>
              ) : filtered.map((balance) => {
                const isOverLimit = balance.overLimitBy > 0;
                const isAtLimit = !isOverLimit && balance.available === 0;

                return (
                  <tr key={balance.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">{balance.name}</div>
                      <div className="text-xs text-slate-500">{balance.email}</div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700">{formatCurrency(balance.creditLimit)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                      {formatCurrency(balance.pendingBalance)}
                      {balance.creditBalance ? (
                        <div className="text-xs font-semibold text-emerald-600">
                          + {formatCurrency(balance.creditBalance)} a favor
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700">{formatCurrency(balance.available)}</td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          isOverLimit
                            ? "bg-red-100 text-red-700"
                            : isAtLimit
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {isOverLimit
                          ? `Sobregiro ${formatCurrency(balance.overLimitBy)}`
                          : isAtLimit
                          ? "Sin cupo"
                          : "Con cupo"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingBalance(balance)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Ajustar límite
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingBalance ? (
        <EditLimitModal
          balance={editingBalance}
          saving={updateLimitMutation.isPending}
          onClose={() => setEditingBalance(null)}
          onSave={(creditLimit) => updateLimitMutation.mutate({ id: editingBalance.id, creditLimit })}
        />
      ) : null}
    </div>
  );
}
