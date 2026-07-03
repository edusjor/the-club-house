"use client";

import { ChangeEvent, Suspense, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  formatReceiptSummary,
  parsePaymentReceipt,
  serializePaymentReceipt,
} from "@/lib/payment-receipt";
import { CheckCircle2, CreditCard, UploadCloud } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  status: string;
  receipt?: string | null;
  createdAt: string;
  comment?: string | null;
  order?: { id: string; total: number } | null;
};

type Order = {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  payments: { id: string; status: string; amount: number }[];
};

const MAX_RECEIPT_FILE_SIZE = 4 * 1024 * 1024;

function ParentPaymentsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [orderOverrideId, setOrderOverrideId] = useState<string | null>(null);
  const [ignoreCheckoutPrefill, setIgnoreCheckoutPrefill] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [receiptFileName, setReceiptFileName] = useState("");
  const [receiptDataUrl, setReceiptDataUrl] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const checkoutOrderId = (searchParams.get("orderId") ?? "").trim();
  const checkoutMode = searchParams.get("checkout") === "1";

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["parent-payments"],
    queryFn: () => axios.get("/api/payments").then((response) => response.data),
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ["parent-orders"],
    queryFn: () => axios.get("/api/orders").then((response) => response.data),
  });

  const outstandingOrders = useMemo(() => {
    return orders
      .map((order) => {
        const approvedAmount = order.payments
          .filter((payment) => payment.status === "APPROVED")
          .reduce((sum, payment) => sum + payment.amount, 0);
        const pendingAmount = Math.max(0, order.total - approvedAmount);

        return {
          ...order,
          pendingAmount,
        };
      })
      .filter((order) => order.pendingAmount > 0)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const effectiveOrderId =
    orderOverrideId ?? (ignoreCheckoutPrefill ? "" : checkoutOrderId);

  const selectedOrder = outstandingOrders.find((order) => order.id === effectiveOrderId);

  const paymentMutation = useMutation({
    mutationFn: (payload: { orderId?: string; amount: number; receipt?: string }) =>
      axios.post("/api/payments", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      queryClient.invalidateQueries({ queryKey: ["parent-orders"] });
      setReceiptReference("");
      setReceiptFileName("");
      setReceiptDataUrl("");
      setOrderOverrideId("");
      setIgnoreCheckoutPrefill(true);
      setAmountInput("");
      setError("");
      setFeedback("Pago enviado correctamente. Quedó en revisión del administrador.");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo enviar el pago";
      setFeedback("");
      setError(message);
    },
  });

  const amount = Number(amountInput || selectedOrder?.pendingAmount || 0);
  const amountValue = amountInput || (selectedOrder ? String(selectedOrder.pendingAmount) : "");

  const handleOrderChange = (nextOrderId: string) => {
    setOrderOverrideId(nextOrderId);
    setAmountInput("");
    setError("");
    setFeedback("");
  };

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setReceiptFileName("");
      setReceiptDataUrl("");
      return;
    }

    if (file.size > MAX_RECEIPT_FILE_SIZE) {
      setError("El archivo supera 4MB. Sube una imagen o PDF más liviano.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("No se pudo leer el comprobante seleccionado.");
        return;
      }

      setReceiptFileName(file.name);
      setReceiptDataUrl(reader.result);
      setError("");
    };

    reader.onerror = () => {
      setError("No se pudo procesar el comprobante. Intenta nuevamente.");
    };

    reader.readAsDataURL(file);
  };

  const submitPayment = () => {
    if (amount <= 0) {
      setFeedback("");
      setError("Debes indicar un monto mayor a 0");
      return;
    }

    const receipt = serializePaymentReceipt({
      reference: receiptReference,
      fileName: receiptFileName,
      dataUrl: receiptDataUrl,
    });

    if (!receipt) {
      setFeedback("");
      setError("Debes subir comprobante o ingresar referencia SINPE.");
      return;
    }

    setError("");
    setFeedback("");

    paymentMutation.mutate({
      orderId: effectiveOrderId || undefined,
      amount,
      receipt,
    });
  };

  return (
    <div>
      <Header title="Pagos" subtitle="Gestiona pagos pendientes y comprobantes SINPE" />
      <div className="p-6 space-y-4">
        {checkoutMode && !ignoreCheckoutPrefill ? (
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-700">
            Pedido enviado correctamente. Completa el pago y sube el comprobante para revisión del administrador.
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <CreditCard className="h-4 w-4 text-cyan-600" />
            Registrar nuevo pago
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={effectiveOrderId}
              onChange={(event) => {
                handleOrderChange(event.target.value);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">Sin orden específica</option>
              {outstandingOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  Orden #{order.id.slice(0, 8)} · Pendiente {formatCurrency(order.pendingAmount)}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              value={amountValue}
              onChange={(event) => setAmountInput(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
              placeholder="Monto"
            />

            <input
              value={receiptReference}
              onChange={(event) => setReceiptReference(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
              placeholder="Referencia SINPE (opcional si subes archivo)"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              <UploadCloud className="h-4 w-4" />
              Subir comprobante
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleReceiptFileChange}
                className="hidden"
              />
            </label>

            {receiptFileName ? (
              <div className="text-xs text-slate-500">
                Archivo: {receiptFileName} ·{" "}
                <a
                  href={receiptDataUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  Ver archivo
                </a>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Puedes subir imagen/PDF o escribir la referencia SINPE.
              </div>
            )}
          </div>

          {selectedOrder && (
            <p className="mt-3 text-xs text-slate-500">
              Pendiente de esta orden: {formatCurrency(selectedOrder.pendingAmount)}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={submitPayment}
              disabled={paymentMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {paymentMutation.isPending ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {paymentMutation.isPending ? "Enviando..." : "Enviar pago"}
            </button>
          </div>

          {feedback && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {feedback}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 font-semibold text-slate-900">Órdenes con saldo pendiente</div>
          {outstandingOrders.length === 0 ? (
            <p className="text-sm text-slate-500">No tienes saldos pendientes en este momento.</p>
          ) : (
            <div className="space-y-3">
              {outstandingOrders.map((order) => (
                <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">Orden #{order.id.slice(0, 8)}</div>
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
        </div>

        <div className="space-y-4">
          {paymentsLoading ? (
            <div className="text-sm text-slate-500">Cargando pagos...</div>
          ) : payments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-400">Aún no has registrado pagos</div>
          ) : (
            payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                {(() => {
                  const receipt = parsePaymentReceipt(payment.receipt);

                  return (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-900">Pago {payment.id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-500">{formatDateTime(payment.createdAt)} · Orden {payment.order?.id.slice(0, 8) ?? "N/A"}</div>
                    {receipt?.kind === "UPLOAD" ? (
                      <div className="mt-1 text-xs text-slate-500">
                        Comprobante: {formatReceiptSummary(payment.receipt)} ·{" "}
                        <a
                          href={receipt.dataUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-cyan-700 hover:text-cyan-800"
                        >
                          Ver archivo
                        </a>
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">
                        Comprobante: {receipt?.reference ?? "Sin archivo"}
                      </div>
                    )}
                    {payment.comment && <div className="mt-1 text-xs text-slate-500">Comentario: {payment.comment}</div>}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-900">{formatCurrency(payment.amount)}</div>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
                  );
                })()}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ParentPaymentsLoading() {
  return (
    <div>
      <Header title="Pagos" subtitle="Gestiona pagos pendientes y comprobantes SINPE" />
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando pagos...
        </div>
      </div>
    </div>
  );
}

export default function ParentPaymentsPage() {
  return (
    <Suspense fallback={<ParentPaymentsLoading />}>
      <ParentPaymentsContent />
    </Suspense>
  );
}