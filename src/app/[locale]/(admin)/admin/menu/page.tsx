"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatCurrency, PRICE_LEVELS } from "@/lib/utils";
import Image from "next/image";
import { Leaf, MilkOff, Plus, Search, Edit2, Trash2, WheatOff, X } from "lucide-react";
import DietaryTagBadges, { DietaryTagLabels } from "@/components/dashboard/DietaryTagBadges";
import { DIETARY_TAGS, getDietaryTags, type DietaryTag } from "@/lib/food-tabs";

type Category = { id: string; name: string };
type PriceRow = { level: string; price: number };
type FoodItem = {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
  ingredients?: string | null;
  tags?: string | null;
  available: boolean;
  availableDays?: string | null;
  stockQuantity?: number | null;
  createdAt: string;
  category: Category;
  prices: PriceRow[];
};

type ApiError = {
  error?: string;
  message?: string;
};

type MenuFormPayload = {
  name: string;
  image: string;
  description: string;
  categoryId: string;
  ingredients: string;
  tags: string[];
  available: boolean;
  availableDays: string[];
  stockQuantity: number | null;
  prices: PriceRow[];
};

type MenuModalProps = {
  item?: FoodItem;
  categories: Category[];
  onClose: () => void;
  onSave: (data: MenuFormPayload) => void;
};

const EMPTY_MENU_ITEMS: FoodItem[] = [];
const EMPTY_CATEGORIES: Category[] = [];

const levelLabelByValue = Object.fromEntries(
  PRICE_LEVELS.map((level) => [level.value, level.label])
) as Record<string, string>;

const DIETARY_LABELS: DietaryTagLabels = {
  GLUTEN_FREE: "Sin gluten",
  LACTOSE_FREE: "Sin lactosa",
  VEGETARIAN: "Vegetariano",
};

const DIETARY_ICONS: Record<DietaryTag, React.ElementType> = {
  GLUTEN_FREE: WheatOff,
  LACTOSE_FREE: MilkOff,
  VEGETARIAN: Leaf,
};

function parseArrayValue(rawValue?: string | null): string[] {
  if (!rawValue) return [];
  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is string => typeof value === "string"
    );
  } catch {
    return [];
  }
}

function normalizePriceRows(prices: PriceRow[]): PriceRow[] {
  const byLevel = new Map(prices.map((row) => [row.level, row.price]));

  return PRICE_LEVELS.map((level) => ({
    level: level.value,
    price: byLevel.get(level.value) ?? 0,
  }));
}

function MenuModal({ item, categories, onClose, onSave }: MenuModalProps) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    image: item?.image ?? "",
    description: item?.description ?? "",
    categoryId: item?.category?.id ?? categories[0]?.id ?? "",
    ingredients: item?.ingredients ?? "",
    tags: getDietaryTags(item?.tags) as string[],
    available: item?.available ?? true,
    availableDays: parseArrayValue(item?.availableDays),
    stockQuantity: item?.stockQuantity ?? null,
    prices: normalizePriceRows(item?.prices ?? []),
  });
  const [uploadError, setUploadError] = useState("");
  const [isReadingFile, setIsReadingFile] = useState(false);

  const canPreviewImage =
    form.image.startsWith("http://") ||
    form.image.startsWith("https://") ||
    form.image.startsWith("/") ||
    form.image.startsWith("data:image/");

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Selecciona un archivo de imagen válido.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setUploadError("La imagen supera 4MB. Usa una imagen más liviana.");
      return;
    }

    setUploadError("");
    setIsReadingFile(true);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((current) => ({ ...current, image: result }));
      }
      setIsReadingFile(false);
    };
    reader.onerror = () => {
      setUploadError("No se pudo procesar la imagen. Intenta nuevamente.");
      setIsReadingFile(false);
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="font-bold text-slate-900">{item ? "Editar comida" : "Nueva comida"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>

            <input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} placeholder="Ingredientes" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            <input
              type="number"
              min={0}
              value={form.stockQuantity ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setForm({ ...form, stockQuantity: value === "" ? null : Number(value) });
              }}
              placeholder="Stock (opcional)"
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
            />

            <div className="space-y-2 md:col-span-2">
              <div className="text-sm font-semibold text-slate-900">Imagen (link o archivo)</div>
              <input
                value={form.image}
                onChange={(e) => {
                  setUploadError("");
                  setForm({ ...form, image: e.target.value });
                }}
                placeholder="https://... o /uploads/..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Subir imagen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                {form.image ? (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image: "" })}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Quitar imagen
                  </button>
                ) : null}
                <span className="text-xs text-slate-500">Max 4MB</span>
              </div>
              {isReadingFile ? (
                <p className="text-xs font-semibold text-cyan-700">Procesando imagen...</p>
              ) : null}
              {uploadError ? (
                <p className="text-xs font-semibold text-red-600">{uploadError}</p>
              ) : null}
              {form.image && canPreviewImage ? (
                <div className="relative h-28 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <Image
                    src={form.image}
                    alt="Preview"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>

            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" rows={3} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm md:col-span-2" />
            <div className="md:col-span-2">
              <p className="mb-1.5 text-xs font-semibold text-slate-600">Etiquetas dietéticas</p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_TAGS.map((tag) => {
                  const Icon = DIETARY_ICONS[tag];
                  const checked = form.tags.includes(tag);

                  return (
                    <label
                      key={tag}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                        checked
                          ? "border-cyan-400 bg-cyan-50 text-slate-900"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            tags: e.target.checked
                              ? [...form.tags, tag]
                              : form.tags.filter((current) => current !== tag),
                          })
                        }
                        className="h-4 w-4 accent-cyan-500"
                      />
                      <Icon className="h-4 w-4" />
                      {DIETARY_LABELS[tag]}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-4 w-4 accent-cyan-500" />Disponible</label>
              <input value={form.availableDays.join(", ")} onChange={(e) => setForm({ ...form, availableDays: e.target.value.split(",").map((day) => day.trim()).filter(Boolean) })} placeholder="Dias disponibles" className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" />
            </div>

            <div className="md:col-span-2">
              <div className="mb-2 text-sm font-semibold text-slate-900">Precios por tipo</div>
              <div className="space-y-2.5">
                {form.prices.map((row, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2.5">
                    <div className="col-span-7 flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 md:col-span-6">
                      {levelLabelByValue[row.level] ?? row.level}
                    </div>
                    <input type="number" min={0} value={row.price} onChange={(e) => setForm({ ...form, prices: form.prices.map((current, currentIndex) => currentIndex === index ? { ...current, price: Number(e.target.value) } : current) })} className="col-span-5 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm md:col-span-6" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
            <button
              onClick={() => onSave({ ...form, stockQuantity: form.stockQuantity ?? null })}
              disabled={isReadingFile}
              className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isReadingFile ? "Procesando..." : item ? "Actualizar" : "Crear"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminMenuPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FoodItem | undefined>();
  const [creating, setCreating] = useState(false);

  const menuQuery = useQuery<FoodItem[], AxiosError<ApiError>>({
    queryKey: ["menu"],
    queryFn: () =>
      axios.get("/api/menu", { timeout: 12000 }).then((response) => response.data),
    retry: 1,
  });
  const categoriesQuery = useQuery<Category[], AxiosError<ApiError>>({
    queryKey: ["categories"],
    queryFn: () =>
      axios
        .get("/api/categories", { timeout: 12000 })
        .then((response) => response.data),
    retry: 1,
  });

  const items = menuQuery.data ?? EMPTY_MENU_ITEMS;
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const isLoading = menuQuery.isPending;
  const menuErrorMessage =
    menuQuery.error?.response?.data?.error ??
    menuQuery.error?.response?.data?.message ??
    menuQuery.error?.message ??
    "No se pudo cargar el menu.";

  const createMutation = useMutation({ mutationFn: (data: Record<string, unknown>) => axios.post("/api/menu", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menu"] }); setCreating(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, ...data }: FoodItem) => axios.put(`/api/menu/${id}`, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["menu"] }); setEditing(undefined); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => axios.delete(`/api/menu/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["menu"] }) });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q) || (item.description ?? "").toLowerCase().includes(q) || item.category.name.toLowerCase().includes(q));
  }, [items, search]);

  const availableCount = items.filter((item) => item.available).length;
  const categoryCount = new Set(items.map((item) => item.category.id)).size;

  return (
    <div>
      <Header title="Menu de Comidas" subtitle="Alta, edicion y control del catalogo" actions={<button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"><Plus className="h-4 w-4" />Nueva comida</button>} />
      <div className="p-6 space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total de items</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{items.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Disponibles</p>
            <p className="mt-1 text-2xl font-black text-emerald-600">{availableCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorias activas</p>
            <p className="mt-1 text-2xl font-black text-cyan-600">{categoryCount}</p>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar comida..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {isLoading ? <div className="text-slate-400">Cargando...</div> : null}

          {menuQuery.isError ? (
            <div className="col-span-full rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">No se pudo cargar el menú.</p>
              <p className="mt-1 text-red-600">{menuErrorMessage}</p>
              <button
                type="button"
                onClick={() => menuQuery.refetch()}
                className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {!isLoading && !menuQuery.isError && filtered.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <p className="text-lg font-semibold text-slate-900">No se encontraron comidas para esta busqueda.</p>
              <p className="mt-2 text-sm text-slate-500">Prueba con otro termino o crea una comida nueva.</p>
            </div>
          ) : null}

          {filtered.map((item) => {
            return (
              <article
                key={item.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-cyan-50 to-slate-100 text-5xl">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      unoptimized
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <span className="transition-transform duration-300 group-hover:scale-110">🍽️</span>
                  )}

                  <span className="absolute left-3 top-3 rounded-full border border-white/60 bg-white/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700 shadow-sm backdrop-blur-sm">
                    {item.category.name}
                  </span>

                  <div className="absolute right-3 top-3">
                    <StatusBadge status={item.available ? "ACTIVE" : "INACTIVE"} />
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-900">{item.name}</h3>

                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">
                    {item.description ?? "Sin descripcion"}
                  </p>

                  <DietaryTagBadges rawTags={item.tags} labels={DIETARY_LABELS} className="mt-4" />

                  <div className="mt-4 space-y-1.5 text-sm">
                    {item.prices.map((price) => (
                      <div
                        key={price.level}
                        className="flex items-center justify-between"
                      >
                        <span className="text-slate-500">
                          {levelLabelByValue[price.level] ?? price.level}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(price.price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setEditing(item)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-cyan-100 hover:text-cyan-700"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() =>
                        confirm("¿Eliminar comida?") &&
                        deleteMutation.mutate(item.id)
                      }
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-red-100 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {(creating || editing) && (
        <MenuModal
          item={editing}
          categories={categories}
          onClose={() => { setCreating(false); setEditing(undefined); }}
          onSave={(data) => editing ? updateMutation.mutate({ ...editing, ...data, tags: JSON.stringify(data.tags), availableDays: JSON.stringify(data.availableDays) } as unknown as FoodItem) : createMutation.mutate({ ...data, tags: data.tags, availableDays: data.availableDays })}
        />
      )}
    </div>
  );
}
