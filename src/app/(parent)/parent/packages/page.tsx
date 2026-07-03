"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckCircle2, PackagePlus } from "lucide-react";

type Student = { id: string; name: string; grade: string; level: string };
type PackageOption = {
  id: string;
  name: string;
  description?: string | null;
  level?: string | null;
  price: number;
  validityDays?: number | null;
  status: string;
};
type StudentPackage = {
  id: string;
  status: string;
  consumed: number;
  remaining: number;
  startDate: string;
  endDate?: string | null;
  student: { name: string; grade: string; level: string };
  package: { name: string; price: number; validityDays?: number | null };
};

export default function ParentPackagesPage() {
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [packageId, setPackageId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["parent-students"],
    queryFn: () => axios.get("/api/students").then((response) => response.data),
  });

  const { data: packageOptions = [] } = useQuery<PackageOption[]>({
    queryKey: ["available-packages"],
    queryFn: () => axios.get("/api/packages").then((response) => response.data),
  });

  const { data: studentPackages = [] } = useQuery<StudentPackage[]>({
    queryKey: ["student-packages"],
    queryFn: () => axios.get("/api/student-packages").then((response) => response.data),
  });

  const purchaseMutation = useMutation({
    mutationFn: () =>
      axios.post("/api/student-packages", {
        studentId,
        packageId,
        startDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-packages"] });
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      setFeedback("Paquete comprado correctamente. Se generó un pago pendiente para revisión.");
      setError("");
      setPackageId("");
      setStudentId("");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo comprar el paquete";
      setFeedback("");
      setError(message);
    },
  });

  return (
    <div>
      <Header title="Paquetes" subtitle="Consulta y compra planes de comidas para tus hijos" />
      <div className="p-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <PackagePlus className="h-4 w-4 text-cyan-600" />
            Comprar paquete
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">Selecciona estudiante</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.grade}
                </option>
              ))}
            </select>

            <select
              value={packageId}
              onChange={(event) => setPackageId(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            >
              <option value="">Selecciona paquete</option>
              {packageOptions
                .filter((pkg) => pkg.status === "ACTIVE")
                .map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} · {formatCurrency(pkg.price)}
                  </option>
                ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                if (!studentId || !packageId) {
                  setFeedback("");
                  setError("Selecciona estudiante y paquete");
                  return;
                }

                setFeedback("");
                setError("");
                purchaseMutation.mutate();
              }}
              disabled={purchaseMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              {purchaseMutation.isPending ? (
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {purchaseMutation.isPending ? "Procesando..." : "Comprar paquete"}
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

        {studentPackages.map((studentPackage) => (
          <div key={studentPackage.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{studentPackage.student.name}</div>
                <div className="text-sm text-slate-500">{studentPackage.package.name}</div>
                <div className="mt-1 text-xs text-slate-500">Restantes: {studentPackage.remaining} · Consumidos: {studentPackage.consumed}</div>
                <div className="mt-1 text-xs text-slate-500">Desde {formatDate(studentPackage.startDate)}{studentPackage.endDate ? ` · Hasta ${formatDate(studentPackage.endDate)}` : ""}</div>
              </div>
              <StatusBadge status={studentPackage.status} />
            </div>
            <div className="mt-3 text-sm text-slate-600">{formatCurrency(studentPackage.package.price)} · {studentPackage.package.validityDays ?? 0} días</div>
          </div>
        ))}
      </div>
    </div>
  );
}