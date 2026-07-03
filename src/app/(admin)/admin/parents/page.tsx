"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Search, UserCircle, Users, ArrowRight } from "lucide-react";

type Parent = { id: string; name: string; email: string; phone?: string; active: boolean; createdAt: string; role: string };
type Student = { id: string; name: string; parentId: string; active: boolean };

export default function AdminParentsPage() {
  const [search, setSearch] = useState("");
  const { data: users = [], isLoading: usersLoading } = useQuery<Parent[]>({ queryKey: ["users"], queryFn: () => axios.get("/api/users").then((r) => r.data) });
  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({ queryKey: ["students"], queryFn: () => axios.get("/api/students").then((r) => r.data) });

  const parents = useMemo(() => users.filter((user) => user.role === "PARENT"), [users]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return parents.filter((parent) => parent.name.toLowerCase().includes(q) || parent.email.toLowerCase().includes(q) || (parent.phone ?? "").toLowerCase().includes(q));
  }, [parents, search]);

  return (
    <div>
      <Header title="Padres" subtitle="Vista dedicada a las cuentas familiares" />
      <div className="p-6 space-y-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar padre o madre..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">Padres registrados</div><div className="mt-1 text-3xl font-black text-slate-900">{parents.length}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">Estudiantes vinculados</div><div className="mt-1 text-3xl font-black text-slate-900">{students.length}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-sm text-slate-500">Activos</div><div className="mt-1 text-3xl font-black text-slate-900">{parents.filter((p) => p.active).length}</div></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Padre/Madre</th>
                <th className="px-5 py-3 text-left">Contacto</th>
                <th className="px-5 py-3 text-left">Hijos</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-left">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(usersLoading || studentsLoading) ? (
                <tr><td className="py-12 text-center text-slate-400" colSpan={5}>Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="py-12 text-center text-slate-400" colSpan={5}>No hay padres</td></tr>
              ) : filtered.map((parent) => {
                const childCount = students.filter((student) => student.parentId === parent.id).length;
                return (
                  <tr key={parent.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700"><UserCircle className="h-4 w-4" /></div>
                        <div>
                          <div className="font-semibold text-slate-900">{parent.name}</div>
                          <div className="text-xs text-slate-500">ID {parent.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{parent.email}<div className="text-xs text-slate-500">{parent.phone ?? "Sin telefono"}</div></td>
                    <td className="px-5 py-3.5"><div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700"><Users className="h-3.5 w-3.5" />{childCount} hijo(s)</div></td>
                    <td className="px-5 py-3.5"><StatusBadge status={parent.active ? "ACTIVE" : "INACTIVE"} /></td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {new Date(parent.createdAt).toLocaleDateString("es-CR")}
                      <div className="mt-1">
                        <Link
                          href={`/admin/parents/${parent.id}`}
                          className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
                        >
                          Ver detalle
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
