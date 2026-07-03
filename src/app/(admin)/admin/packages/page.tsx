"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";

type Category = { id: string; name: string };
type PackageItem = { id?: string; categoryId: string; quantity: number; category?: Category };
type Package = {
  id: string;
  name: string;
  description?: string | null;
  level?: string | null;
  price: number;
  validityDays?: number | null;
  status: string;
  rules?: string | null;
  createdAt: string;
  packageItems: PackageItem[];
};

function PackageModal({ pkg, categories, onClose, onSave }: { pkg?: Package; categories: Category[]; onClose: () => void; onSave: (data: { name: string; description: string; level: string; price: number; validityDays: number; status: string; rules: string; items: PackageItem[]; }) => void; }) {
  const [form, setForm] = useState({
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    level: pkg?.level ?? "ELEMENTARY",
    price: pkg?.price ?? 0,
    validityDays: pkg?.validityDays ?? 30,
    status: pkg?.status ?? "ACTIVE",
    rules: pkg?.rules ?? "",
    items: pkg?.packageItems?.length ? pkg.packageItems.map((item) => ({ categoryId: item.categoryId, quantity: item.quantity })) : [{ categoryId: categories[0]?.id ?? "", quantity: 1 }],
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-900">{pkg ? "Editar paquete" : "Nuevo paquete"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          <input value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} placeholder="Nivel" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} placeholder="Precio" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          <input type="number" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })} placeholder="Vigencia" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="PAUSED">Pausado</option></select>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion" className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-2" />
          <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Reglas" className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-2" />
          <div className="md:col-span-2 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Items del paquete</div>
            {form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3">
                <select value={item.categoryId} onChange={(e) => setForm({ ...form, items: form.items.map((current, currentIndex) => currentIndex === index ? { ...current, categoryId: e.target.value } : current) })} className="col-span-8 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input type="number" min={1} value={item.quantity} onChange={(e) => setForm({ ...form, items: form.items.map((current, currentIndex) => currentIndex === index ? { ...current, quantity: Number(e.target.value) } : current) })} className="col-span-3 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
                <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, currentIndex) => currentIndex !== index) })} className="col-span-1 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600">−</button>
              </div>
            ))}
            <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { categoryId: categories[0]?.id ?? "", quantity: 1 }] })} className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Agregar item</button>
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600">{pkg ? "Actualizar" : "Crear"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Package | undefined>();
  const [creating, setCreating] = useState(false);

  const { data: packages = [], isLoading } = useQuery<Package[]>({ queryKey: ["packages"], queryFn: () => axios.get("/api/packages").then((r) => r.data) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["categories"], queryFn: () => axios.get("/api/categories").then((r) => r.data) });

  const createMutation = useMutation({ mutationFn: (data: Record<string, unknown>) => axios.post("/api/packages", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["packages"] }); setCreating(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, ...data }: Package) => axios.put(`/api/packages/${id}`, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["packages"] }); setEditing(undefined); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => axios.delete(`/api/packages/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packages"] }) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return packages.filter((pkg) => pkg.name.toLowerCase().includes(q) || (pkg.description ?? "").toLowerCase().includes(q));
  }, [packages, search]);

  return (
    <div>
      <Header title="Paquetes" subtitle="Gestiona paquetes y planes de comida" actions={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Nuevo paquete</button>} />
      <div className="p-6 space-y-5">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar paquete..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? <div className="text-slate-400">Cargando...</div> : filtered.map((pkg) => (
            <div key={pkg.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{pkg.description ?? "Sin descripcion"}</p>
                </div>
                <StatusBadge status={pkg.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Precio</div><div className="font-semibold text-slate-900">{formatCurrency(pkg.price)}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">Vigencia</div><div className="font-semibold text-slate-900">{pkg.validityDays ?? 0} dias</div></div>
              </div>
              <div className="mt-4 text-sm text-slate-600">{pkg.packageItems.length} categoria(s) incluidas</div>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditing(pkg)} className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-100 hover:text-cyan-600"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => confirm("¿Eliminar paquete?") && deleteMutation.mutate(pkg.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {(creating || editing) && <PackageModal pkg={editing} categories={categories} onClose={() => { setCreating(false); setEditing(undefined); }} onSave={(data) => editing ? updateMutation.mutate({ ...editing, ...data }) : createMutation.mutate(data)} />}
    </div>
  );
}
