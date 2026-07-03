"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { Search, UtensilsCrossed, Plus } from "lucide-react";

type Student = { id: string; name: string; grade: string; level: string; parent?: { name: string } };
type FoodItem = { id: string; name: string; category: { name: string } };
type Consumption = { id: string; consumedAt: string; notes?: string | null; student: { name: string; parent?: { name: string } }; foodItem: { name: string; category: { name: string } }; studentPackage?: { package: { name: string } } | null; registeredBy?: { name: string } };

export default function AdminConsumptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [foodItemId, setFoodItemId] = useState("");
  const [notes, setNotes] = useState("");

  const { data: students = [] } = useQuery<Student[]>({ queryKey: ["admin-students"], queryFn: () => axios.get("/api/students").then((r) => r.data) });
  const { data: menu = [] } = useQuery<FoodItem[]>({ queryKey: ["menu"], queryFn: () => axios.get("/api/menu").then((r) => r.data) });
  const { data: consumptions = [], isLoading } = useQuery<Consumption[]>({ queryKey: ["admin-consumptions"], queryFn: () => axios.get("/api/consumptions").then((r) => r.data) });

  const registerMutation = useMutation({
    mutationFn: (data: { studentId: string; foodItemId: string; notes: string }) => axios.post("/api/consumptions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-consumptions"] });
      setNotes("");
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return consumptions.filter((consumption) => consumption.student.name.toLowerCase().includes(q) || consumption.foodItem.name.toLowerCase().includes(q) || (consumption.registeredBy?.name ?? "").toLowerCase().includes(q));
  }, [consumptions, search]);

  return (
    <div>
      <Header title="Consumos" subtitle="Registro y auditoria de consumos de estudiantes" />
      <div className="p-6 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 font-bold text-slate-900"><Plus className="h-4 w-4 text-cyan-600" />Registrar consumo</div>
          <div className="grid gap-3 md:grid-cols-4">
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="">Selecciona estudiante</option>{students.map((student) => <option key={student.id} value={student.id}>{student.name} · {student.grade}</option>)}</select>
            <select value={foodItemId} onChange={(e) => setFoodItemId(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="">Selecciona comida</option>{menu.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            <button onClick={() => studentId && foodItemId && registerMutation.mutate({ studentId, foodItemId, notes })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"><UtensilsCrossed className="h-4 w-4" />Registrar</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar consumo..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? <div className="text-slate-400">Cargando...</div> : filtered.map((consumption) => (
            <div key={consumption.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900">{consumption.student.name}</div>
                  <div className="text-xs text-slate-500">{consumption.student.parent?.name ?? "Sin padre"} · {consumption.foodItem.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateTime(consumption.consumedAt)}</div>
                </div>
                <div className="text-right">
                  <StatusBadge status={consumption.studentPackage?.package.name ? 'ACTIVE' : 'INACTIVE'} />
                  <div className="mt-1 text-xs text-slate-500">Registrado por {consumption.registeredBy?.name ?? "Sistema"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
