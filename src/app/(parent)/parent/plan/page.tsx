"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/dashboard/Header";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { CalendarDays, Minus, Pencil, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";

type Student = {
  id: string;
  name: string;
  grade: string;
  level: string;
  active: boolean;
};

type FoodPrice = {
  id: string;
  level: string;
  price: number;
};

type FoodItem = {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
  tags?: string | null;
  available: boolean;
  category: {
    id: string;
    name: string;
    color?: string | null;
  };
  prices: FoodPrice[];
};

type DraftLineItem = {
  foodItemId: string;
  foodName: string;
  categoryName: string;
  quantity: number;
  price: number;
};

type CartLine = {
  id: string;
  studentId: string;
  studentName: string;
  scheduledDate: string;
  items: DraftLineItem[];
};

const tagLabelMap: Record<string, string> = {
  healthy: "Saludable",
  vegetarian: "Vegetariano",
  "gluten-free": "Sin gluten",
  dairy: "Con lacteos",
  nuts: "Con nueces",
};

const tagClassMap: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-700",
  vegetarian: "bg-emerald-100 text-emerald-700",
  "gluten-free": "bg-amber-100 text-amber-700",
  dairy: "bg-blue-100 text-blue-700",
  nuts: "bg-orange-100 text-orange-700",
};

function parseTagList(rawTags: string | null | undefined): string[] {
  if (!rawTags) return [];
  try {
    const parsed: unknown = JSON.parse(rawTags);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

function getPriceForStudentLevel(food: FoodItem, studentLevel: string) {
  const exact = food.prices.find((price) => price.level === studentLevel);
  if (exact) return exact.price;

  if (food.prices.length === 0) return null;

  return [...food.prices].sort((a, b) => a.price - b.price)[0].price;
}

function toDateOnlyValue(date: Date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function buildScheduledDate(dateValue: string, timeValue: string) {
  return `${dateValue}T${timeValue}`;
}

function splitScheduledDate(scheduledDate: string) {
  const [datePart = "", rawTime = "12:00"] = scheduledDate.split("T");
  return {
    datePart,
    timePart: rawTime.slice(0, 5),
  };
}

function sortCartLines(lines: CartLine[]) {
  return [...lines].sort((a, b) => {
    const byDate = a.scheduledDate.localeCompare(b.scheduledDate);
    if (byDate !== 0) return byDate;

    const byStudent = a.studentName.localeCompare(b.studentName, "es");
    if (byStudent !== 0) return byStudent;

    return a.id.localeCompare(b.id);
  });
}

function createLineId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `line-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ParentPlanPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("12:00");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [formError, setFormError] = useState("");

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["parent-students"],
    queryFn: () => axios.get("/api/students").then((response) => response.data),
  });

  const { data: menu = [], isLoading: menuLoading } = useQuery<FoodItem[]>({
    queryKey: ["parent-menu"],
    queryFn: () => axios.get("/api/menu").then((response) => response.data),
  });

  const activeStudents = useMemo(
    () => students.filter((student) => student.active),
    [students]
  );

  const effectiveStudentId = studentId;

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === effectiveStudentId),
    [students, effectiveStudentId]
  );

  const today = useMemo(() => new Date(), []);
  const todayValue = useMemo(() => toDateOnlyValue(today), [today]);

  const draftDateValue = draftDate || todayValue;
  const draftScheduledDate = draftDateValue ? buildScheduledDate(draftDateValue, draftTime) : "";

  const groupedMenu = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filteredItems = menu
      .filter((item) => item.available)
      .filter((item) => {
        if (!normalizedSearch) return true;
        const tags = parseTagList(item.tags).join(" ").toLowerCase();
        return (
          item.name.toLowerCase().includes(normalizedSearch) ||
          (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
          item.category.name.toLowerCase().includes(normalizedSearch) ||
          tags.includes(normalizedSearch)
        );
      });

    const grouped = new Map<
      string,
      { id: string; name: string; color?: string | null; items: FoodItem[] }
    >();

    for (const item of filteredItems) {
      const key = item.category.id;
      const existing = grouped.get(key);
      if (existing) {
        existing.items.push(item);
        continue;
      }

      grouped.set(key, {
        id: item.category.id,
        name: item.category.name,
        color: item.category.color,
        items: [item],
      });
    }

    return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [menu, search]);

  const getQuantityForFood = (foodId: string) => quantities[foodId] ?? 1;

  const updateQuantityForFood = (foodId: string, nextQuantity: number) => {
    setQuantities((current) => ({
      ...current,
      [foodId]: Math.max(1, Math.min(10, nextQuantity)),
    }));
  };

  const addFoodToDraft = (food: FoodItem) => {
    if (!effectiveStudentId || !selectedStudent) {
      setFormError("Primero elige el hijo.");
      return;
    }

    if (!selectedStudent.active) {
      setFormError("El estudiante seleccionado no esta activo.");
      return;
    }

    const quantity = getQuantityForFood(food.id);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      setFormError("La cantidad por comida debe estar entre 1 y 10.");
      return;
    }

    const selectedPrice = getPriceForStudentLevel(food, selectedStudent.level);

    if (!selectedPrice || selectedPrice <= 0) {
      setFormError("Esta comida no tiene precio configurado para el nivel de tu hijo.");
      return;
    }

    setFormError("");

    setDraftItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.foodItemId === food.id && item.price === selectedPrice
      );

      if (existingIndex === -1) {
        return [
          ...current,
          {
            foodItemId: food.id,
            foodName: food.name,
            categoryName: food.category.name,
            quantity,
            price: selectedPrice,
          },
        ];
      }

      return current.map((item, index) => {
        if (index !== existingIndex) return item;
        return {
          ...item,
          quantity: Math.min(30, item.quantity + quantity),
        };
      });
    });
  };

  const saveDraftToCart = () => {
    if (!effectiveStudentId || !selectedStudent) {
      setFormError("Selecciona un hijo antes de guardar la linea.");
      return;
    }

    if (draftItems.length === 0) {
      setFormError("Agrega al menos un producto a la linea.");
      return;
    }

    if (!draftDateValue) {
      setFormError("Selecciona una fecha para esta linea.");
      return;
    }

    if (!draftTime) {
      setFormError("Selecciona una hora para esta linea.");
      return;
    }

    const nextScheduledDate = buildScheduledDate(draftDateValue, draftTime);
    const parsed = new Date(nextScheduledDate);

    if (Number.isNaN(parsed.getTime())) {
      setFormError("La fecha y hora seleccionadas no son validas.");
      return;
    }

    const lineToSave: CartLine = {
      id: editingLineId ?? createLineId(),
      studentId: effectiveStudentId,
      studentName: selectedStudent.name,
      scheduledDate: nextScheduledDate,
      items: draftItems.map((item) => ({ ...item })),
    };

    setCartLines((current) => sortCartLines([...current, lineToSave]));

    setDraftItems([]);
    setEditingLineId(null);
    setQuantities({});
    setFormError("");
  };

  const clearDraftLine = () => {
    setDraftItems([]);
    setEditingLineId(null);
    setQuantities({});
    setFormError("");
  };

  const removeItemFromDraft = (itemIndex: number) => {
    setDraftItems((current) => current.filter((_, index) => index !== itemIndex));
  };

  const editLineFromCart = (lineId: string) => {
    const line = cartLines.find((item) => item.id === lineId);
    if (!line) return;

    setCartLines((current) => current.filter((item) => item.id !== lineId));
    setEditingLineId(line.id);
    setStudentId(line.studentId);

    const { datePart, timePart } = splitScheduledDate(line.scheduledDate);
    setDraftDate(datePart);

    setDraftTime(timePart || "12:00");
    setDraftItems(line.items.map((item) => ({ ...item })));
    setFormError("");

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const removeLineFromCart = (lineId: string) => {
    setCartLines((current) => current.filter((item) => item.id !== lineId));
  };

  const draftUnits = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const draftTotal = draftItems.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const savedUnits = cartLines.reduce(
    (sum, line) => sum + line.items.reduce((lineSum, item) => lineSum + item.quantity, 0),
    0
  );

  const savedTotal = cartLines.reduce(
    (sum, line) =>
      sum +
      line.items.reduce((lineSum, item) => lineSum + item.quantity * item.price, 0),
    0
  );

  const orderMutation = useMutation({
    mutationFn: async (lines: CartLine[]) => {
      const response = await axios.post("/api/orders", {
        items: lines.flatMap((line) =>
          line.items.map((item) => ({
            studentId: line.studentId,
            foodItemId: item.foodItemId,
            scheduledDate: line.scheduledDate,
            quantity: item.quantity,
          }))
        ),
      });

      return response.data as { id: string };
    },
    onSuccess: (createdOrder) => {
      queryClient.invalidateQueries({ queryKey: ["parent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["parent-payments"] });
      setCartLines([]);
      setDraftItems([]);
      setEditingLineId(null);
      setQuantities({});
      setFormError("");

      router.push(`/parent/payments?checkout=1&orderId=${createdOrder.id}`);
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : "No se pudo crear el pedido";
      setFormError(message);
    },
  });

  const submitAllOrders = () => {
    if (draftItems.length > 0) {
      setFormError("Tienes una linea en edicion. Agregala al carrito o limpiala antes de solicitar.");
      return;
    }

    if (cartLines.length === 0 || orderMutation.isPending) return;

    setFormError("");
    orderMutation.mutate(cartLines);
  };

  return (
    <div>
      <Header
        title="Pedir Comida Para Mi Hijo"
        subtitle="Primero elige tu hijo. Luego agrega productos y define fecha y hora en una linea de pedido."
      />

      <div
        className={`space-y-4 px-3 pt-3 sm:space-y-6 sm:px-6 sm:pt-6 ${
          draftItems.length > 0 ? "pb-44 sm:pb-40" : "pb-20"
        }`}
      >
        {!selectedStudent ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-sm font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900">Elegir hijo</h2>
                <p className="text-sm text-slate-600">Primero elige tu hijo para continuar.</p>
              </div>
            </div>

            <div className="mt-5 -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
              {studentsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                  Cargando hijos...
                </div>
              ) : (
                activeStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => {
                      setStudentId(student.id);
                      setFormError("");
                    }}
                    className="w-[260px] shrink-0 snap-start rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-all hover:border-cyan-300 hover:shadow-sm sm:w-auto sm:shrink"
                  >
                    <p className="font-bold text-slate-900">{student.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{student.grade}</p>
                  </button>
                ))
              )}
            </div>

            {formError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-2xl font-black text-slate-900">{selectedStudent.name}</p>

                  <button
                    onClick={() => {
                      if (draftItems.length > 0) {
                        setFormError("Primero agrega o limpia la linea en edicion.");
                        return;
                      }
                      setStudentId("");
                      setSearch("");
                      setFormError("");
                    }}
                    className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                  >
                    Cambiar hijo
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar comida..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
                />
              </div>
            </section>

            {formError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            ) : null}
          </>
        )}

        {selectedStudent ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
          <section className="space-y-4">
            {studentsLoading || menuLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
                Cargando menu y estudiantes...
              </div>
            ) : groupedMenu.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <p className="text-lg font-semibold text-slate-900">
                  No hay comidas disponibles para ese filtro.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Prueba otro termino de busqueda o limpia el filtro.
                </p>
              </div>
            ) : (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                {groupedMenu.map((group) => (
                  <section key={group.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-7 w-2 rounded-full"
                        style={{ backgroundColor: group.color ?? "#06b6d4" }}
                      />
                      <h3 className="text-lg font-black text-slate-900">{group.name}</h3>
                      <span className="text-xs font-medium text-slate-500">
                        {group.items.length} opcion(es)
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {group.items.map((item) => {
                        const selectedPrice = selectedStudent
                          ? getPriceForStudentLevel(item, selectedStudent.level)
                          : null;
                        const quantity = getQuantityForFood(item.id);
                        const tags = parseTagList(item.tags).slice(0, 2);

                        return (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                          >
                            <div className="relative mb-3">
                              <div className="mx-auto relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                                {item.image ? (
                                  <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    unoptimized
                                    loader={({ src }) => src}
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
                                )}
                              </div>
                              {tags.length > 0 ? (
                                <span className="absolute right-0 top-0 inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-700">
                                  ✓
                                </span>
                              ) : null}
                            </div>

                            <div className="min-h-[86px]">
                              <h4 className="line-clamp-2 text-base font-bold leading-snug text-slate-900">{item.name}</h4>
                              {item.description ? (
                                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                              ) : null}

                              {tags.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {tags.map((tag) => (
                                    <span
                                      key={`${item.id}-${tag}`}
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        tagClassMap[tag] ?? "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {tagLabelMap[tag] ?? tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2">
                              <p className="text-lg font-black text-slate-900">
                                {selectedPrice ? formatCurrency(selectedPrice) : "Elige hijo"}
                              </p>
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50">
                                <button
                                  onClick={() => updateQuantityForFood(item.id, quantity - 1)}
                                  className="px-2.5 py-2 text-slate-600 hover:text-slate-900"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-8 text-center text-sm font-bold text-slate-800">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantityForFood(item.id, quantity + 1)}
                                  className="px-2.5 py-2 text-slate-600 hover:text-slate-900"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => addFoodToDraft(item)}
                                disabled={!selectedStudent || !selectedPrice}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                <Plus className="h-4 w-4" />
                                Agregar
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-slate-700" />
                <h3 className="text-3xl font-black text-slate-900">Carrito</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">Tus pedidos se organizan por dia y hora.</p>
              <p className="mt-1 text-sm text-slate-500">
                En el carrito puedes editar fecha, quitar productos o agregar mas a una linea existente.
              </p>
            </div>

            <div className="max-h-[540px] space-y-3 overflow-y-auto p-3">
              {draftItems.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-900">
                    Tienes una linea en edicion sin agregar al carrito.
                  </p>
                </div>
              ) : null}

              {cartLines.length === 0 ? (
                <div className="px-2 py-10 text-center text-sm text-slate-400">
                  Todavia no has agregado lineas al carrito.
                </div>
              ) : (
                cartLines.map((line) => (
                  <div key={line.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-bold text-cyan-700">{formatDateTime(line.scheduledDate)}</p>
                      <button
                        onClick={() => editLineFromCart(line.id)}
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Editar linea"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="space-y-2 px-3 py-3">
                      {line.items.map((item, itemIndex) => (
                        <div
                          key={`${line.id}-${item.foodItemId}-${itemIndex}`}
                          className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2"
                        >
                          <span className="text-xs font-semibold text-slate-500">{item.quantity}x</span>
                          <p className="text-sm font-semibold leading-snug text-slate-700">{item.foodName}</p>
                          <span className="text-sm font-bold text-slate-700">
                            {formatCurrency(item.quantity * item.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-3 py-2 text-xs font-semibold">
                      <button
                        onClick={() => editLineFromCart(line.id)}
                        className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-800"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>

                      <button
                        onClick={() => editLineFromCart(line.id)}
                        className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar producto
                      </button>

                      <button
                        onClick={() => removeLineFromCart(line.id)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="text-xl font-black text-slate-800">Total general</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900">{formatCurrency(savedTotal)}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{savedUnits} unidad(es)</p>
                </div>
              </div>

              <button
                onClick={submitAllOrders}
                disabled={cartLines.length === 0 || orderMutation.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {orderMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                {orderMutation.isPending ? "Enviando..." : "Solicitar pedido e ir a pagar"}
              </button>

              <p className="mt-3 text-xs text-slate-500">
                Se enviará un pedido con todas las líneas y luego pasarás directo a Pagos.
              </p>
            </div>
          </aside>
        </div>
        ) : null}

        {draftItems.length > 0 ? (
          <div className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_16px_34px_rgba(15,23,42,0.18)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {draftItems.slice(0, 4).map((item, index) => (
                      <span
                        key={`${item.foodItemId}-${index}`}
                        className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      >
                        <span className="truncate">{item.quantity}x {item.foodName}</span>
                        <button
                          onClick={() => removeItemFromDraft(index)}
                          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Quitar ${item.foodName}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {draftItems.length > 4 ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        +{draftItems.length - 4} mas
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    {draftUnits} producto(s) - {formatCurrency(draftTotal)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:flex lg:items-end">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold text-slate-700">Fecha</span>
                    <div className="relative">
                      <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="date"
                        min={todayValue}
                        value={draftDateValue}
                        onChange={(event) => setDraftDate(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-2 text-xs lg:w-[160px]"
                      />
                    </div>
                  </label>

                  <label>
                    <span className="mb-1 block text-[11px] font-semibold text-slate-700">Hora</span>
                    <input
                      type="time"
                      step={300}
                      value={draftTime}
                      onChange={(event) => setDraftTime(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs lg:w-[130px]"
                    />
                  </label>

                  <button
                    onClick={saveDraftToCart}
                    className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600 lg:col-span-1 lg:w-[165px]"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Agregar linea
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {draftScheduledDate ? formatDateTime(draftScheduledDate) : "Selecciona fecha y hora"}
                </span>

                <button
                  onClick={clearDraftLine}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
