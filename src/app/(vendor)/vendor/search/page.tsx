"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Search } from "lucide-react";

type Student = { id: string; name: string; grade: string; level: string; allergies?: string | null; restrictions?: string | null; active: boolean; parent?: { name: string; phone?: string | null }; studentPackages?: { status: string; remaining: number; package: { name: string } }[] };

export default function VendorSearchPage() {
  const [search, setSearch] = useState("");
  const { data: students = [], isLoading } = useQuery<Student[]>({ queryKey: ["vendor-search-students"], queryFn: () => axios.get("/api/students").then((r) => r.data) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((student) => student.name.toLowerCase().includes(q) || student.grade.toLowerCase().includes(q) || student.level.toLowerCase().includes(q) || (student.parent?.name ?? "").toLowerCase().includes(q));
  }, [students, search]);

  return (
    <div>
      <Header title="Buscar Estudiante" subtitle="Localiza rapidamente a cualquier estudiante" />
      <div className="p-6 space-y-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, grado o padre..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? <div className="text-slate-400">Cargando...</div> : filtered.map((student) => (
            <div key={student.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{student.name}</h3>
                  <p className="text-sm text-slate-500">{student.grade} · {student.level}</p>
                </div>
                <StatusBadge status={student.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className="mt-3 text-sm text-slate-700">
                <div>Padre: {student.parent?.name ?? 'Sin padre'}</div>
                <div>Telefono: {student.parent?.phone ?? '—'}</div>
                <div className="mt-2 text-xs text-slate-500">Alergias: {student.allergies ?? 'Ninguna'}</div>
                <div className="text-xs text-slate-500">Restricciones: {student.restrictions ?? 'Ninguna'}</div>
              </div>
              <div className="mt-4 space-y-2">
                {student.studentPackages?.length ? student.studentPackages.map((sp) => <div key={sp.package.name} className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-700">{sp.package.name} · {sp.remaining} restantes</div>) : <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-500">Sin paquete activo</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}