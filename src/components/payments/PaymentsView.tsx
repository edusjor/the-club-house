"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Link from "@/i18n/Link";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import ReceiptFileLink from "@/components/ReceiptFileLink";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { formatReceiptSummary, parsePaymentReceipt } from "@/lib/payment-receipt";
import { useTranslations } from "@/i18n/I18nProvider";
import { Search, Check, X, Save } from "lucide-react";

type Payment = {
  id: string;
  parentId: string;
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
  approvedBy?: { name: string; role: string } | null;
};

function fill(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, value), template);
}

function PaymentCard({
  payment,
  parentDetailHref,
  onUpdate,
  isUpdating,
}: {
  payment: Payment;
  parentDetailHref: string;
  onUpdate: (data: { status?: string; amount?: number; comment?: string }) => void;
  isUpdating: boolean;
}) {
  const t = useTranslations();
  const [amount, setAmount] = useState(String(payment.amount));
  const [comment, setComment] = useState(payment.comment ?? "");
  const receipt = parsePaymentReceipt(payment.receipt);

  const parsedAmount = Number(amount);
  const amountChanged = parsedAmount !== payment.amount;
  const commentChanged = comment !== (payment.comment ?? "");
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const pendingBalance = payment.parent?.parentBalance?.pendingBalance ?? 0;

  // `targetStatus` is undefined for a plain "save changes" — in that case
  // the payment's current status is what it'll stay at.
  const confirmIfNeeded = (targetStatus?: string) => {
    const willBeApproved = targetStatus ? targetStatus === "APPROVED" : payment.status === "APPROVED";
    const effectiveAmount = amountChanged ? parsedAmount : payment.amount;

    if (willBeApproved && effectiveAmount > pendingBalance) {
      const excess = effectiveAmount - pendingBalance;
      return window.confirm(
        fill(t("paymentsView.confirmExceedsBalance"), {
          amount: formatCurrency(effectiveAmount),
          balance: formatCurrency(pendingBalance),
          excess: formatCurrency(excess),
        })
      );
    }

    if (amountChanged && payment.status === "APPROVED") {
      return window.confirm(
        fill(t("paymentsView.confirmAmountChangeApproved"), {
          old: formatCurrency(payment.amount),
          new: formatCurrency(parsedAmount),
        })
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
          <h3 className="font-bold text-slate-900">
            <Link href={parentDetailHref} className="hover:text-cyan-700 hover:underline">
              {payment.parent?.name ?? t("paymentsView.unknownParent")}
            </Link>
          </h3>
          <p className="text-sm text-slate-500">{payment.parent?.email ?? ""}</p>
          <p className="mt-1 text-xs text-slate-500">
            {t("paymentsView.pendingBalance")}: <span className="font-semibold text-slate-700">{formatCurrency(pendingBalance)}</span>
            {payment.parent?.parentBalance?.creditBalance ? (
              <span className="ml-2 font-semibold text-emerald-600">
                · {t("paymentsView.creditBalance")}: {formatCurrency(payment.parent.parentBalance.creditBalance)}
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(payment.createdAt)}</p>
          {payment.status === "APPROVED" && payment.approvedBy ? (
            <p className="mt-1 text-xs text-slate-500">
              {t("paymentsView.approvedBy")}: <span className="font-semibold text-slate-700">{payment.approvedBy.name}</span>
              {payment.approvedBy.role === "VENDOR" ? (
                <span className="ml-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                  {t("status.vendor")}
                </span>
              ) : null}
            </p>
          ) : null}
          {receipt?.kind === "UPLOAD" ? (
            <p className="mt-2 text-xs text-slate-500">
              {t("paymentsView.receipt")}: {formatReceiptSummary(payment.receipt)} ·{" "}
              <ReceiptFileLink dataUrl={receipt.dataUrl} className="font-semibold text-cyan-700 hover:text-cyan-800">
                {t("paymentsView.viewFile")}
              </ReceiptFileLink>
            </p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">{t("paymentsView.receipt")}: {receipt?.reference ?? t("paymentsView.noFile")}</p>
          )}
        </div>
        <StatusBadge status={payment.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr]">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">{t("paymentsView.amount")}</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-500">{t("paymentsView.notesLabel")}</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("paymentsView.notesPlaceholder")}
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
          {t("paymentsView.saveChanges")}
        </button>

        {payment.status === "APPROVED" ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-white">
            <Check className="h-4 w-4" />
            {t("paymentsView.approved")}
          </span>
        ) : (
          <button
            onClick={() => handleDecision("APPROVED")}
            disabled={isUpdating || !amountValid}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {t("paymentsView.approve")}
          </button>
        )}

        {payment.status === "REJECTED" ? (
          <span className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white">
            <X className="h-4 w-4" />
            {t("paymentsView.rejected")}
          </span>
        ) : (
          <button
            onClick={() => handleDecision("REJECTED")}
            disabled={isUpdating || !amountValid}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            {t("paymentsView.reject")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PaymentsView({ parentDetailBasePath }: { parentDetailBasePath: string }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  // Defaults to "pending" — that's what needs action; "all" is one click away.
  const [statusFilter, setStatusFilter] = useState("PENDING");

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
          : t("paymentsView.updateError");
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
      <Header title={t("paymentsView.title")} subtitle={t("paymentsView.subtitle")} />
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("paymentsView.searchPlaceholder")} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">{t("paymentsView.filterAll")}</option>
            <option value="PENDING">{t("paymentsView.filterPending")}</option>
            <option value="APPROVED">{t("paymentsView.filterApproved")}</option>
            <option value="REJECTED">{t("paymentsView.filterRejected")}</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-slate-400">{t("paymentsView.loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">
              {statusFilter === "PENDING" ? t("paymentsView.noPaymentsPending") : t("paymentsView.noPayments")}
            </div>
          ) : filtered.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              parentDetailHref={`${parentDetailBasePath}/${payment.parentId}`}
              isUpdating={updateMutation.isPending && updateMutation.variables?.id === payment.id}
              onUpdate={(data) => updateMutation.mutate({ id: payment.id, ...data })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
