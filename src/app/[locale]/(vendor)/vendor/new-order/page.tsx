"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "@/i18n/Link";
import Header from "@/components/dashboard/Header";
import { formatCurrency, normalizePriceLevel } from "@/lib/utils";
import {
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  UtensilsCrossed,
  UserRound,
  X,
} from "lucide-react";

type Student = {
  id: string;
  name: string;
  level: string;
  active: boolean;
  parent?: { name: string; phone?: string | null } | null;
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
  available: boolean;
  category: { id: string; name: string };
  prices: FoodPrice[];
};

type VendorMenuTab = "GENERAL" | "DRINKS" | "CASADOS";

const vendorMenuTabs: { key: VendorMenuTab; label: string }[] = [
  { key: "GENERAL", label: "Comida general" },
  { key: "DRINKS", label: "Bebidas" },
  { key: "CASADOS", label: "Casados" },
];

type CartLine = {
  foodItemId: string;
  foodName: string;
  price: number;
  quantity: number;
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function getVendorMenuTab(item: Pick<FoodItem, "name" | "category">): VendorMenuTab {
  const normalizedName = normalizeToken(item.name);
  const normalizedCategory = normalizeToken(item.category.name);

  if (normalizedName.includes("casado") || normalizedCategory.includes("casado")) {
    return "CASADOS";
  }

  if (
    normalizedCategory.includes("bebida") ||
    normalizedCategory.includes("drink") ||
    normalizedCategory.includes("jugo") ||
    normalizedCategory.includes("refresco")
  ) {
    return "DRINKS";
  }

  return "GENERAL";
}

function getPriceForStudentLevel(food: FoodItem, studentLevel: string) {
  const normalizedStudentLevel = normalizePriceLevel(studentLevel);
  const exact = food.prices.find(
    (price) => normalizePriceLevel(price.level) === normalizedStudentLevel
  );
  if (exact) return exact.price;

  if (food.prices.length === 0) return null;

  return [...food.prices].sort((a, b) => a.price - b.price)[0].price;
}

function VendorNewOrderContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("studentId") ?? "";

  const [studentSearch, setStudentSearch] = useState("");
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(!preselectedStudentId);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId);

  const [menuSearch, setMenuSearch] = useState("");
  const [activeTab, setActiveTab] = useState<VendorMenuTab>("GENERAL");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["vendor-students"],
    queryFn: () => axios.get("/api/students").then((response) => response.data),
  });

  const { data: menu = [], isLoading: menuLoading } = useQuery<FoodItem[]>({
    queryKey: ["vendor-menu"],
    queryFn: () => axios.get("/api/menu").then((response) => response.data),
  });

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const filteredStudents = useMemo(() => {
    const normalizedQuery = normalizeToken(studentSearch.trim());
    if (!normalizedQuery) return students.filter((student) => student.active);

    return students
      .filter((student) => student.active)
      .filter((student) => normalizeToken(student.name).includes(normalizedQuery));
  }, [students, studentSearch]);

  const filteredMenu = useMemo(() => {
    const normalizedSearch = normalizeToken(menuSearch.trim());

    return menu
      .filter((item) => item.available)
      .filter((item) => {
        if (!normalizedSearch) return true;
        return (
          normalizeToken(item.name).includes(normalizedSearch) ||
          normalizeToken(item.category.name).includes(normalizedSearch)
        );
      })
      .filter((item) => getVendorMenuTab(item) === activeTab);
  }, [menu, menuSearch, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<VendorMenuTab, number> = { GENERAL: 0, DRINKS: 0, CASADOS: 0 };
    for (const item of menu) {
      if (!item.available) continue;
      counts[getVendorMenuTab(item)] += 1;
    }
    return counts;
  }, [menu]);

  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const cartUnits = cart.reduce((sum, line) => sum + line.quantity, 0);

  const selectStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    setIsStudentPickerOpen(false);
    setFeedback("");
    setError("");
  };

  const changeStudent = () => {
    if (cart.length > 0) {
      const confirmed = window.confirm(
        "Cada pedido es para un solo estudiante. Si cambias de estudiante se borrará todo lo agregado. ¿Deseas continuar?"
      );
      if (!confirmed) return;
      setCart([]);
    }

    setSelectedStudentId("");
    setIsStudentPickerOpen(true);
    setFeedback("");
    setError("");
  };

  const addToOrder = (food: FoodItem) => {
    if (!selectedStudent) return;

    const price = getPriceForStudentLevel(food, selectedStudent.level);
    if (!price || price <= 0) {
      setError("Esta comida no tiene precio configurado para el nivel de este estudiante.");
      return;
    }

    setError("");
    setCart((current) => {
      const existing = current.find((line) => line.foodItemId === food.id);
      if (existing) {
        return current.map((line) =>
          line.foodItemId === food.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { foodItemId: food.id, foodName: food.name, price, quantity: 1 }];
    });
  };

  const changeQuantity = (foodItemId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.foodItemId === foodItemId ? { ...line, quantity: line.quantity + delta } : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const removeLine = (foodItemId: string) => {
    setCart((current) => current.filter((line) => line.foodItemId !== foodItemId));
  };

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const scheduledDate = new Date().toISOString();
      const response = await axios.post("/api/orders", {
        items: cart.map((line) => ({
          studentId: selectedStudentId,
          foodItemId: line.foodItemId,
          scheduledDate,
          quantity: line.quantity,
        })),
      });
      return response.data as { id: string; total: number }[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setCart([]);
      setError("");
      setFeedback(
        `Pedido enviado a cocina para ${selectedStudent?.name}. Se cargó a la cuenta de ${selectedStudent?.parent?.name ?? "su padre/madre"}.`
      );
      setSelectedStudentId("");
      setIsStudentPickerOpen(true);
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : "No se pudo enviar el pedido";
      setFeedback("");
      setError(message);
    },
  });

  const acceptOrder = () => {
    if (!selectedStudentId) {
      setError("Selecciona un estudiante antes de aceptar el pedido.");
      return;
    }
    if (cart.length === 0) {
      setError("Agrega al menos un producto al pedido.");
      return;
    }
    setError("");
    setFeedback("");
    acceptMutation.mutate();
  };

  return (
    <div>
      <Header
        title="Nueva Orden en Restaurante"
        subtitle="Pedido directo en el mostrador: busca al estudiante, arma el pedido y envíalo a cocina"
      />

      <div className="space-y-4 p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {selectedStudent && !isStudentPickerOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                  <UserRound className="h-5 w-5 text-cyan-700" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">{selectedStudent.name}</p>
                  <p className="text-xs font-semibold text-slate-600">
                    {selectedStudent.level}
                    {selectedStudent.parent?.name ? ` · Padre/Madre: ${selectedStudent.parent.name}` : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={changeStudent}
                className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                Cambiar estudiante
              </button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Buscar estudiante por nombre</p>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Nombre del estudiante..."
                  autoFocus
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
                />
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {studentsLoading ? (
                  <p className="text-sm text-slate-500">Cargando estudiantes...</p>
                ) : filteredStudents.length === 0 ? (
                  <p className="text-sm text-slate-500">No se encontraron estudiantes.</p>
                ) : (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => selectStudent(student)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
                    >
                      <p className="font-bold text-slate-900">{student.name}</p>
                      <p className="mt-1 text-xs text-slate-600">{student.level}</p>
                      {student.parent?.name ? (
                        <p className="mt-0.5 text-xs text-slate-400">{student.parent.name}</p>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {selectedStudent && !isStudentPickerOpen ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    placeholder="Buscar comida..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {vendorMenuTabs.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-cyan-500 bg-cyan-500 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tabCounts[tab.key]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {menuLoading ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
                    Cargando menú...
                  </div>
                ) : filteredMenu.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <p className="text-lg font-semibold text-slate-900">
                      No hay comidas disponibles para esta pestaña.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMenu.map((item) => {
                      const price = getPriceForStudentLevel(item, selectedStudent.level);

                      return (
                        <article
                          key={item.id}
                          className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                        >
                          <div className="relative h-32 overflow-hidden bg-gradient-to-br from-cyan-50 to-slate-100 text-5xl">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                unoptimized
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <span className="flex h-full items-center justify-center">🍽️</span>
                            )}
                            <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm">
                              <UtensilsCrossed className="h-4 w-4" />
                            </div>
                          </div>

                          <div className="relative -mt-4 rounded-t-[1.25rem] bg-white px-4 pb-4 pt-3">
                            <span className="inline-flex items-center rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                              {item.category.name}
                            </span>

                            <h4 className="mt-2 line-clamp-2 text-base font-bold leading-tight text-slate-900">
                              {item.name}
                            </h4>

                            <div className="mt-3 flex items-center justify-between border-t border-cyan-100 pt-3">
                              <span className="text-sm font-black text-slate-900">
                                {price ? formatCurrency(price) : "Sin precio"}
                              </span>
                              <button
                                onClick={() => addToOrder(item)}
                                disabled={!price}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Agregar a orden
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-slate-700" />
                  <h3 className="text-2xl font-black text-slate-900">Pedido actual</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">Para {selectedStudent.name}</p>
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
                {cart.length === 0 ? (
                  <div className="px-2 py-10 text-center text-sm text-slate-400">
                    Agrega productos del menú.
                  </div>
                ) : (
                  cart.map((line) => (
                    <div
                      key={line.foodItemId}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{line.foodName}</p>
                        <p className="text-xs text-slate-500">{formatCurrency(line.price)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => changeQuantity(line.foodItemId, -1)}
                          className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
                          aria-label={`Quitar una unidad de ${line.foodName}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-bold text-slate-800">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => changeQuantity(line.foodItemId, 1)}
                          className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
                          aria-label={`Agregar una unidad de ${line.foodName}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeLine(line.foodItemId)}
                        className="rounded-md p-1 text-red-500 hover:bg-red-50"
                        aria-label={`Quitar ${line.foodName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="text-lg font-black text-slate-800">Total</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(cartTotal)}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{cartUnits} unidad(es)</p>
                  </div>
                </div>

                {error ? (
                  <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  onClick={acceptOrder}
                  disabled={cart.length === 0 || acceptMutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-base font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {acceptMutation.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {acceptMutation.isPending ? "Enviando..." : "Aceptar y enviar a cocina"}
                </button>

                <p className="mt-3 text-xs text-slate-500">
                  Al aceptar, el pedido pasa directo a cocina y el monto se carga al saldo del padre/madre.
                </p>
              </div>
            </aside>
          </div>
        ) : null}

        {feedback ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span>{feedback}</span>
            <div className="flex items-center gap-2">
              <Link
                href="/vendor/orders"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Ver en Pedidos del Día
              </Link>
              <button
                onClick={() => setFeedback("")}
                className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VendorNewOrderLoading() {
  return (
    <div>
      <Header
        title="Nueva Orden en Restaurante"
        subtitle="Pedido directo en el mostrador: busca al estudiante, arma el pedido y envíalo a cocina"
      />
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Cargando...
        </div>
      </div>
    </div>
  );
}

export default function VendorNewOrderPage() {
  return (
    <Suspense fallback={<VendorNewOrderLoading />}>
      <VendorNewOrderContent />
    </Suspense>
  );
}
