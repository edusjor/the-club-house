"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";

type Category = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  active: boolean;
  createdAt: string;
};

function CategoryModal({
  category,
  onClose,
  onSave,
}: {
  category?: Category;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    color: string;
    icon: string;
    active: boolean;
  }) => void;
}) {
  const [form, setForm] = useState({
    name: category?.name ?? "",
    description: category?.description ?? "",
    color: category?.color ?? "#0ea5e9",
    icon: category?.icon ?? "",
    active: category?.active ?? true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-900">{category ? "Editar categoria" : "Nueva categoria"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="space-y-4 p-6">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion" className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <div className="grid grid-cols-2 gap-3">
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white p-1" />
            <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Icono" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-cyan-500" />
            Activa
          </label>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600">{category ? "Actualizar" : "Crear"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | undefined>();
  const [creating, setCreating] = useState(false);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => axios.get("/api/categories").then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; color: string; icon: string; active: boolean }) => axios.post("/api/categories", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setCreating(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Category) => axios.put(`/api/categories/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["categories"] }); setEditing(undefined); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return categories.filter((category) => category.name.toLowerCase().includes(q) || (category.description ?? "").toLowerCase().includes(q));
  }, [categories, search]);

  return (
    <div>
      <Header title="Categorias" subtitle="Gestiona las categorias del menu" actions={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Nueva categoria</button>} />
      <div className="p-6 space-y-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar categoria..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Categoria</th>
                <th className="px-5 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-left">Color</th>
                <th className="px-5 py-3 text-left">Creada</th>
                <th className="px-5 py-3 text-right" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td className="py-12 text-center text-slate-400" colSpan={5}>Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="py-12 text-center text-slate-400" colSpan={5}>No hay categorias</td></tr>
              ) : filtered.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{category.name}</div>
                    <div className="text-xs text-slate-500">{category.description ?? "Sin descripcion"}</div>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={category.active ? "ACTIVE" : "INACTIVE"} /></td>
                  <td className="px-5 py-3.5"><span className="inline-flex items-center gap-2 text-xs text-slate-600"><span className="h-3 w-3 rounded-full border border-slate-200" style={{ backgroundColor: category.color ?? "#cbd5e1" }} />{category.color ?? "—"}</span></td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{new Date(category.createdAt).toLocaleDateString("es-CR")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setEditing(category)} className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-100 hover:text-cyan-600"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => confirm("¿Eliminar categoria?") && deleteMutation.mutate(category.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(creating || editing) && (
        <CategoryModal
          category={editing}
          onClose={() => { setCreating(false); setEditing(undefined); }}
          onSave={(data) => editing ? updateMutation.mutate({ ...editing, ...data }) : createMutation.mutate(data)}
        />
      )}
    </div>
  );
}
