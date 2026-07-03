"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import Header from "@/components/dashboard/Header";
import { formatCurrency } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Plus, Search } from "lucide-react";

type Student = { id: string; name: string; grade: string; level: string };
type FoodItem = { id: string; name: string; category: { name: string } };
type Eligibility = {
  coverageType: "ORDER" | "PACKAGE" | "CHARGE";
  unitPrice: number;
  message: string;
  student: {
    name: string;
    grade: string;
    allergies: string | null;
    restrictions: string | null;
  };
  foodItem: {
    name: string;
    categoryName: string;
  };
  orderItem?: {
    orderId: string;
    scheduledDate: string;
  };
  studentPackage?: {
    packageName: string;
    remaining: number;
  };
};
type ConsumptionResponse = {
  billing: {
    coverageType: "ORDER" | "PACKAGE" | "CHARGE";
    message: string;
    chargedAmount: number;
  };
};

export default function VendorRegisterPage() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [foodItemId, setFoodItemId] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["vendor-students"], queryFn: () => axios.get("/api/students").then((r) => r.data) });
  const { data: menu = [] } = useQuery<FoodItem[]>({ queryKey: ["vendor-menu"], queryFn: () => axios.get("/api/menu").then((r) => r.data) });

  const {
    data: eligibility,
    isFetching: eligibilityLoading,
    error: eligibilityError,
  } = useQuery<Eligibility>({
    queryKey: ["consumption-eligibility", studentId, foodItemId],
    queryFn: () =>
      axios
        .get("/api/consumptions/eligibility", {
          params: { studentId, foodItemId },
        })
        .then((r) => r.data),
    enabled: Boolean(studentId && foodItemId),
  });

  const registerMutation = useMutation({
    mutationFn: (data: { studentId: string; foodItemId: string; notes: string }) =>
      axios.post("/api/consumptions", data).then((r) => r.data as ConsumptionResponse),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-consumptions"] });
      queryClient.invalidateQueries({ queryKey: ["consumption-eligibility"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      setNotes("");
      setError("");
      setFeedback(
        data.billing.coverageType === "CHARGE"
          ? `${data.billing.message} Se agregó ${formatCurrency(data.billing.chargedAmount)} a por pagar.`
          : data.billing.message
      );
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo registrar el consumo";
      setFeedback("");
      setError(message);
    },
  });

  const actionLabel =
    eligibility?.coverageType === "CHARGE"
      ? `Registrar y cargar ${formatCurrency(eligibility.unitPrice)}`
      : eligibility?.coverageType === "PACKAGE"
      ? "Registrar con paquete"
      : eligibility?.coverageType === "ORDER"
      ? "Registrar con pedido"
      : "Registrar";

  const coverageStyles =
    eligibility?.coverageType === "CHARGE"
      ? "border-amber-200 bg-amber-50"
      : "border-emerald-200 bg-emerald-50";

  return (
    <div>
      <Header title="Registrar Consumo" subtitle="Marca cuando un estudiante recibe su comida" />
      <div className="p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-4">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="">Estudiante</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.grade}</option>)}</select>
            <select value={foodItemId} onChange={(e) => setFoodItemId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="">Comida</option>{menu.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.category.name}</option>)}</select>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            <button
              onClick={() => {
                if (!studentId || !foodItemId) return;
                setFeedback("");
                setError("");
                registerMutation.mutate({ studentId, foodItemId, notes });
              }}
              disabled={!studentId || !foodItemId || registerMutation.isPending || eligibilityLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {registerMutation.isPending ? "Registrando..." : actionLabel}
            </button>
          </div>

          {(eligibilityLoading || eligibility || eligibilityError) && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${coverageStyles}`}>
              {eligibilityLoading ? (
                <div className="text-slate-600">Validando cobertura...</div>
              ) : eligibilityError ? (
                <div className="text-red-700">No se pudo validar cobertura. Intenta de nuevo.</div>
              ) : eligibility ? (
                <div className="space-y-2 text-slate-700">
                  <div className="flex items-start gap-2 font-semibold">
                    {eligibility.coverageType === "CHARGE" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-700" />
                    )}
                    <span>{eligibility.message}</span>
                  </div>
                  <div className="text-xs">
                    {eligibility.student.name} · {eligibility.student.grade} · {eligibility.foodItem.name}
                  </div>
                  {eligibility.studentPackage && (
                    <div className="text-xs">
                      Paquete: {eligibility.studentPackage.packageName} ({eligibility.studentPackage.remaining} restantes)
                    </div>
                  )}
                  {eligibility.orderItem && (
                    <div className="text-xs">Pedido del día: #{eligibility.orderItem.orderId.slice(0, 8)}</div>
                  )}
                  {eligibility.coverageType === "CHARGE" && (
                    <div className="text-xs font-semibold">
                      Se cargará {formatCurrency(eligibility.unitPrice)} a por pagar.
                    </div>
                  )}
                  {(eligibility.student.allergies || eligibility.student.restrictions) && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Alergias: {eligibility.student.allergies ?? "Ninguna"} · Restricciones: {eligibility.student.restrictions ?? "Ninguna"}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Search className="h-4 w-4 text-cyan-600" />Uso rapido</div>
          <p className="mt-2">Selecciona estudiante y comida. El sistema valida si está cubierto por pedido o paquete; si no lo está, lo agrega automáticamente a por pagar del padre.</p>
        </div>
      </div>
    </div>
  );
}
