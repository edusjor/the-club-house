"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, formatDate, PRICE_LEVELS } from "@/lib/utils";
import { Plus, Search, Edit2, Trash2, X, XCircle, RotateCcw } from "lucide-react";

type Category = { id: string; name: string };
type PackageItem = { id?: string; categoryId: string; category?: Category };
type PriceRow = { level: string; price: number };
type Package = {
  id: string;
  name: string;
  description?: string | null;
  validityDays?: number | null;
  status: string;
  rules?: string | null;
  createdAt: string;
  packageItems: PackageItem[];
  prices: PriceRow[];
};

type Parent = { id: string; name: string; email?: string | null; phone?: string | null };
type PackageStudent = { id: string; name: string; level: string; parent: Parent };
type StudentPackage = {
  id: string;
  studentId: string;
  packageId: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  consumed: number;
  pricePaid: number;
  createdAt: string;
  student: PackageStudent;
  package: { name: string; prices: PriceRow[] };
};

const levelLabelByValue = Object.fromEntries(
  PRICE_LEVELS.map((level) => [level.value, level.label])
) as Record<string, string>;

function normalizePriceRows(prices: PriceRow[]): PriceRow[] {
  const byLevel = new Map(prices.map((row) => [row.level, row.price]));

  return PRICE_LEVELS.map((level) => ({
    level: level.value,
    price: byLevel.get(level.value) ?? 0,
  }));
}

function PackageModal({ pkg, categories, onClose, onSave }: { pkg?: Package; categories: Category[]; onClose: () => void; onSave: (data: { name: string; description: string; validityDays: number; status: string; rules: string; items: PackageItem[]; prices: PriceRow[]; }) => void; }) {
  const [form, setForm] = useState({
    name: pkg?.name ?? "",
    description: pkg?.description ?? "",
    validityDays: pkg?.validityDays ?? 30,
    status: pkg?.status ?? "ACTIVE",
    rules: pkg?.rules ?? "",
    items: pkg?.packageItems?.length ? pkg.packageItems.map((item) => ({ categoryId: item.categoryId })) : [{ categoryId: categories[0]?.id ?? "" }],
    prices: normalizePriceRows(pkg?.prices ?? []),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-bold text-slate-900">{pkg ? "Editar paquete" : "Nuevo paquete"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-6 md:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm md:col-span-2" />
          <input type="number" value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })} placeholder="Vigencia (dias)" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="PAUSED">Pausado</option></select>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripcion" className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-2" />
          <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Reglas" className="min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-2" />

          <div className="md:col-span-2">
            <div className="mb-2 text-sm font-semibold text-slate-900">Precios por nivel</div>
            <p className="mb-2 text-xs text-slate-500">Pon 0 en un nivel para que el paquete no esté disponible para ese nivel.</p>
            <div className="space-y-2.5">
              {form.prices.map((row, index) => (
                <div key={index} className="grid grid-cols-12 gap-2.5">
                  <div className="col-span-6 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                    {levelLabelByValue[row.level] ?? row.level}
                  </div>
                  <input type="number" min={0} value={row.price} onChange={(e) => setForm({ ...form, prices: form.prices.map((current, currentIndex) => currentIndex === index ? { ...current, price: Number(e.target.value) } : current) })} className="col-span-6 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="text-sm font-semibold text-slate-900">Categorías cubiertas</div>
            <p className="text-xs text-slate-500">El paquete cubre una comida por día, tomada de cualquiera de estas categorías, hasta que vence.</p>
            {form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-3">
                <select value={item.categoryId} onChange={(e) => setForm({ ...form, items: form.items.map((current, currentIndex) => currentIndex === index ? { ...current, categoryId: e.target.value } : current) })} className="col-span-11 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, currentIndex) => currentIndex !== index) })} className="col-span-1 rounded-xl border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600">−</button>
              </div>
            ))}
            <button type="button" onClick={() => setForm({ ...form, items: [...form.items, { categoryId: categories[0]?.id ?? "" }] })} className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Agregar categoría</button>
          </div>
        </div>
        <div className="flex shrink-0 gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => onSave(form)} className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600">{pkg ? "Actualizar" : "Crear"}</button>
        </div>
      </div>
    </div>
  );
}

function PurchasesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: purchases = [], isLoading } = useQuery<StudentPackage[]>({
    queryKey: ["student-packages", "admin"],
    queryFn: () => axios.get("/api/student-packages").then((r) => r.data),
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "cancel" | "reactivate" }) =>
      axios.patch(`/api/student-packages/${id}`, { action }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["student-packages", "admin"] }),
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo actualizar el paquete";
      alert(message);
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return purchases;
    return purchases.filter(
      (sp) =>
        sp.student.parent.name.toLowerCase().includes(q) ||
        (sp.student.parent.email ?? "").toLowerCase().includes(q) ||
        sp.student.name.toLowerCase().includes(q) ||
        sp.package.name.toLowerCase().includes(q)
    );
  }, [purchases, search]);

  return (
    <div className="space-y-5">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por padre, estudiante o paquete..."
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Padre/Madre</th>
              <th className="px-5 py-3 text-left">Estudiante</th>
              <th className="px-5 py-3 text-left">Paquete</th>
              <th className="px-5 py-3 text-right">Precio</th>
              <th className="px-5 py-3 text-left">Inicio</th>
              <th className="px-5 py-3 text-left">Vence</th>
              <th className="px-5 py-3 text-left">Estado</th>
              <th className="px-5 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td className="py-12 text-center text-slate-400" colSpan={8}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="py-12 text-center text-slate-400" colSpan={8}>No hay compras que coincidan</td></tr>
            ) : filtered.map((sp) => {
              const price = sp.package.prices.find((p) => p.level === sp.student.level)?.price;
              const isActing = actionMutation.isPending && actionMutation.variables?.id === sp.id;
              const canCancel = sp.status === "ACTIVE";
              const canReactivate = sp.status === "CANCELLED" || sp.status === "CANCELLED_BY_ADMIN";
              return (
                <tr key={sp.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{sp.student.parent.name}</div>
                    <div className="text-xs text-slate-500">{sp.student.parent.email}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{sp.student.name}</td>
                  <td className="px-5 py-3.5 text-slate-700">{sp.package.name}</td>
                  <td className="px-5 py-3.5 text-right text-slate-700">{price != null ? formatCurrency(price) : "—"}</td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(sp.startDate)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{sp.endDate ? formatDate(sp.endDate) : "Sin vencimiento"}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={sp.status} /></td>
                  <td className="px-5 py-3.5 text-right">
                    {canCancel ? (
                      <button
                        onClick={() => {
                          if (!confirm(`¿Cancelar este paquete? Se descontarán ${formatCurrency(sp.pricePaid)} del saldo de ${sp.student.parent.name}. Verifica que sea apto para cancelar (por ejemplo, que no lo haya usado ya).`)) return;
                          actionMutation.mutate({ id: sp.id, action: "cancel" });
                        }}
                        disabled={actionMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        {isActing ? "Cancelando..." : "Cancelar"}
                      </button>
                    ) : canReactivate ? (
                      <button
                        onClick={() => {
                          if (!confirm(`¿Reactivar este paquete? Se volverán a cargar ${formatCurrency(sp.pricePaid)} al saldo de ${sp.student.parent.name}.`)) return;
                          actionMutation.mutate({ id: sp.id, action: "reactivate" });
                        }}
                        disabled={actionMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isActing ? "Reactivando..." : "Reactivar"}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPackagesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"catalog" | "purchases">("catalog");
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
      <Header title="Paquetes" subtitle="Gestiona paquetes y planes de comida" actions={tab === "catalog" ? <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Nuevo paquete</button> : undefined} />
      <div className="p-6 space-y-5">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          <button onClick={() => setTab("catalog")} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === "catalog" ? "bg-cyan-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Catálogo</button>
          <button onClick={() => setTab("purchases")} className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${tab === "purchases" ? "bg-cyan-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Compras</button>
        </div>

        {tab === "purchases" ? (
          <PurchasesTab />
        ) : (
          <>
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar paquete..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {isLoading ? <div className="text-slate-400">Cargando...</div> : filtered.map((pkg) => {
                const availablePrices = pkg.prices.filter((row) => row.price > 0);
                return (
                  <div key={pkg.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{pkg.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{pkg.description ?? "Sin descripcion"}</p>
                      </div>
                      <StatusBadge status={pkg.status} />
                    </div>
                    <div className="mt-4 space-y-1.5 text-sm">
                      {availablePrices.length === 0 ? (
                        <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">Sin precios configurados</div>
                      ) : (
                        availablePrices.map((row) => (
                          <div key={row.level} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                            <span className="text-xs text-slate-500">{levelLabelByValue[row.level] ?? row.level}</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(row.price)}</span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="mt-3 text-xs text-slate-500">Vigencia: {pkg.validityDays ?? 0} dias</div>
                    <div className="mt-2 text-sm text-slate-600">{pkg.packageItems.length} categoria(s) incluidas</div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => setEditing(pkg)} className="rounded-lg p-1.5 text-slate-400 hover:bg-cyan-100 hover:text-cyan-600"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => confirm("¿Eliminar paquete?") && deleteMutation.mutate(pkg.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      {(creating || editing) && <PackageModal pkg={editing} categories={categories} onClose={() => { setCreating(false); setEditing(undefined); }} onSave={(data) => editing ? updateMutation.mutate({ ...editing, ...data }) : createMutation.mutate(data)} />}
    </div>
  );
}
