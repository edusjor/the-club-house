"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import ReceiptFileLink from "@/components/ReceiptFileLink";
import { formatCurrency, formatDateTime, formatOrderNumber, formatPaymentNumber } from "@/lib/utils";
import { formatReceiptSummary, parsePaymentReceipt, serializePaymentReceipt } from "@/lib/payment-receipt";
import { useTranslations } from "@/i18n/I18nProvider";
import { CheckCircle2, CreditCard, UploadCloud } from "lucide-react";

const MAX_RECEIPT_FILE_SIZE = 4 * 1024 * 1024;

type ParentBalance = {
  id: string;
  pendingBalance: number;
  approvedBalance: number;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  receipt?: string | null;
  createdAt: string;
  comment?: string | null;
  order?: { id: string; total: number } | null;
};

const EMPTY_PAYMENTS: Payment[] = [];

const PAYMENT_TABS = [
  { key: "PENDING", labelKey: "tabPending" },
  { key: "APPROVED", labelKey: "tabApproved" },
  { key: "REJECTED", labelKey: "tabRejected" },
] as const;

type PaymentTabKey = (typeof PAYMENT_TABS)[number]["key"];

function normalizeAmountInput(value: string, max?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  if (typeof max === "number") {
    return Math.min(parsed, Math.max(0, max));
  }
  return parsed;
}

export default function ParentBalancePage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [amountInput, setAmountInput] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptDataUrl, setReceiptDataUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [activePaymentTab, setActivePaymentTab] = useState<PaymentTabKey>("PENDING");

  const { data: balance, isLoading } = useQuery<ParentBalance>({
    queryKey: ["parent-balance"],
    queryFn: () => axios.get("/api/parent-balance").then((response) => response.data),
  });

  const paymentsQuery = useQuery<Payment[]>({
    queryKey: ["parent-payments"],
    queryFn: () => axios.get("/api/payments").then((response) => response.data),
  });
  const payments = paymentsQuery.data ?? EMPTY_PAYMENTS;

  const pendingReviewTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "PENDING")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  const paymentsForActiveTab = useMemo(
    () => payments.filter((payment) => payment.status === activePaymentTab),
    [payments, activePaymentTab]
  );

  const amountValue = amountInput || (balance?.pendingBalance ? String(balance.pendingBalance) : "");
  const amount = normalizeAmountInput(amountValue, balance?.pendingBalance);
  const rawAmount = Number(amountValue || 0);
  const amountExceedsBalance = Number.isFinite(rawAmount) && rawAmount > (balance?.pendingBalance || 0);

  const paymentMutation = useMutation({
    mutationFn: (payload: { amount: number; receipt: string }) =>
      axios.post("/api/balance-payments", payload).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-balance"] });
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      setReceiptReference("");
      setReceiptFileName("");
      setReceiptDataUrl("");
      setAmountInput("");
      setError("");
      setFeedback(t("parent.balance.successPayment"));
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : t("parent.balance.errorSendPayment");
      setFeedback("");
      setError(message);
    },
  });

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setReceiptFileName("");
      setReceiptDataUrl("");
      return;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      setError(t("parent.balance.errorFileTooBig"));
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError(t("parent.balance.errorReceiptRead"));
        return;
      }

      setReceiptFileName(file.name);
      setReceiptDataUrl(reader.result);
      setError("");
    };

    reader.onerror = () => {
      setError(t("parent.balance.errorReceiptProcess"));
    };

    reader.readAsDataURL(file);
  };

  const submitPayment = () => {
    if (!balance) {
      setFeedback("");
      setError(t("parent.balance.errorNoBalance"));
      return;
    }

    if (amount <= 0) {
      setFeedback("");
      setError(t("parent.balance.errorAmountRequired"));
      return;
    }

    if (amountExceedsBalance) {
      setFeedback("");
      setError(t("parent.balance.errorAmountExceeds").replace("{amount}", formatCurrency(balance.pendingBalance)));
      return;
    }

    const receipt = serializePaymentReceipt({
      reference: receiptReference,
      fileName: receiptFileName,
      dataUrl: receiptDataUrl,
    });

    if (!receipt) {
      setFeedback("");
      setError(t("parent.balance.errorReceiptRequired"));
      return;
    }

    setError("");
    setFeedback("");

    paymentMutation.mutate({ amount, receipt });
  };

  return (
    <div>
      <Header title={t("parent.balance.title")} subtitle={t("parent.balance.subtitle")} />
      <div className="p-6 space-y-6">
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            {t("parent.balance.loadingBalance")}
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-cyan-700" />
                  <h3 className="text-2xl font-black text-slate-900">{t("parent.balance.balanceSummary")}</h3>
                </div>
              </div>

              <div className="space-y-3 px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">{t("parent.balance.balanceLabel")}</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      {formatCurrency(balance?.pendingBalance || 0)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{t("parent.balance.totalToPay")}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold text-amber-700">{t("parent.balance.pendingApproval")}</p>
                    <p className="mt-1 text-2xl font-black text-amber-700">
                      {formatCurrency(pendingReviewTotal)}
                    </p>
                    <p className="mt-1 text-xs text-amber-700">{t("parent.balance.alreadySentInReview")}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
                  <p className="font-semibold">{t("parent.balance.importantInfo")}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• {t("parent.balance.infoBullet1")}</li>
                    <li>• {t("parent.balance.infoBullet2")}</li>
                    <li>• {t("parent.balance.infoBullet3")}</li>
                  </ul>
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-cyan-700" />
                  <h3 className="text-xl font-black text-slate-900">{t("parent.balance.makePayment")}</h3>
                </div>
              </div>

              <div className="space-y-3 px-5 py-4">
                <label>
                  <span className="mb-1 block text-[11px] font-semibold text-slate-700">
                    {t("parent.balance.amountToPay")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={amountValue}
                    onChange={(event) => {
                      setAmountInput(event.target.value);
                      setFeedback("");
                      setError("");
                    }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                    placeholder={formatCurrency(balance?.pendingBalance || 0)}
                  />
                </label>

                {amountExceedsBalance ? (
                  <p className="text-xs text-amber-700">{t("parent.balance.amountExceedsBalance")}</p>
                ) : null}

                <input
                  value={receiptReference}
                  onChange={(event) => setReceiptReference(event.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
                  placeholder={t("parent.balance.sinpeReferencePlaceholder")}
                />

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    <UploadCloud className="h-4 w-4" />
                    {t("parent.balance.uploadReceipt")}
                    <input
                      type="file"
                      accept="image/*,.pdf,application/pdf"
                      onChange={handleReceiptFileChange}
                      className="hidden"
                    />
                  </label>

                  {receiptFileName ? (
                    <p className="mt-2 text-xs text-slate-500">
                      {t("parent.balance.fileLabel")}: {receiptFileName} ·{" "}
                      <ReceiptFileLink
                        dataUrl={receiptDataUrl}
                        className="font-semibold text-cyan-700 hover:text-cyan-800"
                      >
                        {t("parent.balance.viewFile")}
                      </ReceiptFileLink>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      {t("parent.balance.uploadHint")}
                    </p>
                  )}
                </div>

                <button
                  onClick={submitPayment}
                  disabled={paymentMutation.isPending || !balance || balance.pendingBalance === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {paymentMutation.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {paymentMutation.isPending ? t("parent.balance.sending") : t("parent.balance.sendPayment")}
                </button>

                {feedback ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {feedback}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-xl font-black text-slate-900">{t("parent.balance.paymentsTitle")}</h3>
          </div>

          <div className="flex gap-2 border-b border-slate-200 px-5 pt-3">
            {PAYMENT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActivePaymentTab(tab.key)}
                className={`px-3 py-2 text-sm font-semibold transition-colors ${
                  activePaymentTab === tab.key
                    ? "border-b-2 border-cyan-500 text-cyan-600"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t(`parent.balance.${tab.labelKey}`)}
              </button>
            ))}
          </div>

          <div className="space-y-3 p-5">
            {paymentsQuery.isLoading ? (
              <div className="text-sm text-slate-500">{t("parent.balance.loadingPayments")}</div>
            ) : paymentsForActiveTab.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-400">
                {t("parent.balance.noPaymentsInCategory")}
              </div>
            ) : (
              paymentsForActiveTab.map((payment) => {
                const receipt = parsePaymentReceipt(payment.receipt);

                return (
                  <div key={payment.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {t("parent.balance.payment")} #{formatPaymentNumber(payment.id)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(payment.createdAt)}
                          {payment.order?.id ? ` · ${t("parent.balance.order")} #${formatOrderNumber(payment.order.id)}` : ""}
                        </div>
                        {receipt?.kind === "UPLOAD" ? (
                          <div className="mt-1 text-xs text-slate-500">
                            {t("parent.balance.receipt")}: {formatReceiptSummary(payment.receipt)} ·{" "}
                            <ReceiptFileLink
                              dataUrl={receipt.dataUrl}
                              className="font-semibold text-cyan-700 hover:text-cyan-800"
                            >
                              {t("parent.balance.viewFile")}
                            </ReceiptFileLink>
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-slate-500">
                            {t("parent.balance.receipt")}: {receipt?.reference ?? t("parent.balance.noFile")}
                          </div>
                        )}
                        {payment.comment ? (
                          <div className="mt-1 text-xs text-slate-500">{t("parent.balance.comment")}: {payment.comment}</div>
                        ) : null}
                      </div>
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(payment.amount)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
