"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import Link from "@/i18n/Link";
import Header from "@/components/dashboard/Header";
import DietaryTagBadges, { DietaryTagLabels } from "@/components/dashboard/DietaryTagBadges";
import { cn, formatCurrency, normalizePriceLevel } from "@/lib/utils";
import { FOOD_TABS, getFoodTab, isPackageEligibleFoodTab, type FoodTab } from "@/lib/food-tabs";
import { useTranslations } from "@/i18n/I18nProvider";
import {
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  ShoppingCart,
  Ticket,
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
  allergies?: string | null;
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
  tags?: string | null;
  available: boolean;
  foodTab?: FoodTab | null;
  category: { id: string; name: string };
  prices: FoodPrice[];
};

type StudentPackageVendorView = {
  id: string;
  usedToday: boolean;
  student: { id: string };
  package: {
    id: string;
    name: string;
    packageItems: { categoryId: string }[];
    eligibleItemNames: string[];
    coversSnack: boolean;
  };
};

type TodayOrder = {
  items: {
    id: string;
    quantity: number;
    delivered: boolean;
    student: { id: string };
    foodItem: { name: string };
  }[];
};

type CartLine =
  | { kind: "CHARGE"; foodItemId: string; foodName: string; price: number; quantity: number }
  | {
      kind: "PACKAGE";
      foodItemId: string;
      foodName: string;
      quantity: 1;
      studentPackageId: string;
      packageName: string;
    };

type OrderSummary = {
  studentName: string;
  isStaff: boolean;
  parentLabel: string;
  lines: { key: string; name: string; quantity: number; price: number; packageName?: string }[];
  total: number;
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function isStaffStudent(student: Pick<Student, "level">) {
  return student.level === "STAFF";
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
  const t = useTranslations();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const preselectedStudentId = searchParams.get("studentId") ?? "";

  const [studentSearch, setStudentSearch] = useState("");
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(!preselectedStudentId);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId);

  const [menuSearch, setMenuSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FoodTab>("GENERAL");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastOrder, setLastOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState("");
  const [packageChoice, setPackageChoice] = useState<{ food: FoodItem; options: StudentPackageVendorView[] } | null>(null);

  const dietaryLabels: DietaryTagLabels = {
    GLUTEN_FREE: t("dietaryTags.glutenFree"),
    LACTOSE_FREE: t("dietaryTags.lactoseFree"),
    VEGETARIAN: t("dietaryTags.vegetarian"),
  };

  const { data: students = [], isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["vendor-students"],
    queryFn: () => axios.get("/api/students").then((response) => response.data),
  });

  const { data: menu = [], isLoading: menuLoading } = useQuery<FoodItem[]>({
    queryKey: ["vendor-menu"],
    queryFn: () => axios.get("/api/menu").then((response) => response.data),
  });

  const { data: studentPackages = [] } = useQuery<StudentPackageVendorView[]>({
    queryKey: ["vendor-student-packages"],
    queryFn: () => axios.get("/api/student-packages").then((response) => response.data),
  });

  const { data: todayOrders = [] } = useQuery<TodayOrder[]>({
    queryKey: ["vendor-orders-today"],
    queryFn: () => axios.get("/api/orders").then((response) => response.data),
  });

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId),
    [students, selectedStudentId]
  );

  const packagesForSelectedStudent = useMemo(
    () => studentPackages.filter((sp) => sp.student.id === selectedStudentId),
    [studentPackages, selectedStudentId]
  );

  const alreadyOrderedToday = useMemo(() => {
    if (!selectedStudentId) return [];
    return todayOrders
      .flatMap((order) => order.items)
      .filter((item) => item.student.id === selectedStudentId && !item.delivered);
  }, [todayOrders, selectedStudentId]);

  const eligiblePackagesForFood = (food: FoodItem): StudentPackageVendorView[] => {
    // A package only ever redeems the dish-of-the-day (CASADOS tab) or a
    // walk-up snack (SNACK tab) — never a regular a-la-carte GENERAL/DRINKS
    // item, even if it happens to share the same food category.
    if (!isPackageEligibleFoodTab(getFoodTab(food))) return [];

    const alreadyPickedInCart = new Set(
      cart.filter((line): line is Extract<CartLine, { kind: "PACKAGE" }> => line.kind === "PACKAGE").map((line) => line.studentPackageId)
    );
    return packagesForSelectedStudent.filter(
      (sp) =>
        !sp.usedToday &&
        !alreadyPickedInCart.has(sp.id) &&
        sp.package.packageItems.some((pi) => pi.categoryId === food.category.id)
    );
  };

  const filteredStudents = useMemo(() => {
    const normalizedQuery = normalizeToken(studentSearch.trim());
    if (!normalizedQuery) return [];

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
      .filter((item) => getFoodTab(item) === activeTab);
  }, [menu, menuSearch, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<FoodTab, number> = { GENERAL: 0, DRINKS: 0, CASADOS: 0, SNACK: 0 };
    for (const item of menu) {
      if (!item.available) continue;
      counts[getFoodTab(item)] += 1;
    }
    return counts;
  }, [menu]);

  const cartTotal = cart.reduce((sum, line) => (line.kind === "CHARGE" ? sum + line.price * line.quantity : sum), 0);
  const cartUnits = cart.reduce((sum, line) => sum + line.quantity, 0);

  const selectStudent = (student: Student) => {
    setSelectedStudentId(student.id);
    setIsStudentPickerOpen(false);
    setLastOrder(null);
    setError("");
  };

  const changeStudent = () => {
    if (cart.length > 0) {
      const confirmed = window.confirm(t("vendor.newOrder.confirmChangeStudent"));
      if (!confirmed) return;
      setCart([]);
    }

    setSelectedStudentId("");
    setIsStudentPickerOpen(true);
    setLastOrder(null);
    setError("");
  };

  const addPackageLine = (food: FoodItem, studentPackage: StudentPackageVendorView) => {
    setCart((current) => [
      ...current,
      {
        kind: "PACKAGE",
        foodItemId: food.id,
        foodName: food.name,
        quantity: 1,
        studentPackageId: studentPackage.id,
        packageName: studentPackage.package.name,
      },
    ]);
  };

  const addToOrder = (food: FoodItem) => {
    if (!selectedStudent) return;

    const eligiblePackages = eligiblePackagesForFood(food);
    if (eligiblePackages.length === 1) {
      setError("");
      addPackageLine(food, eligiblePackages[0]);
      return;
    }
    if (eligiblePackages.length > 1) {
      setError("");
      setPackageChoice({ food, options: eligiblePackages });
      return;
    }

    const price = getPriceForStudentLevel(food, selectedStudent.level);
    if (!price || price <= 0) {
      setError(t("vendor.newOrder.errorNoPriceForLevel"));
      return;
    }

    setError("");
    setCart((current) => {
      const existing = current.find((line) => line.kind === "CHARGE" && line.foodItemId === food.id);
      if (existing) {
        return current.map((line) =>
          line.kind === "CHARGE" && line.foodItemId === food.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [...current, { kind: "CHARGE", foodItemId: food.id, foodName: food.name, price, quantity: 1 }];
    });
  };

  const changeQuantity = (foodItemId: string, delta: number) => {
    setCart((current) =>
      current
        .map((line) =>
          line.kind === "CHARGE" && line.foodItemId === foodItemId
            ? { ...line, quantity: line.quantity + delta }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const removeLine = (index: number) => {
    setCart((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const scheduledDate = new Date().toISOString();

      await axios.post("/api/orders", {
        items: cart.map((line) =>
          line.kind === "PACKAGE"
            ? {
                studentId: selectedStudentId,
                foodItemId: line.foodItemId,
                scheduledDate,
                quantity: 1,
                studentPackageId: line.studentPackageId,
              }
            : {
                studentId: selectedStudentId,
                foodItemId: line.foodItemId,
                scheduledDate,
                quantity: line.quantity,
              }
        ),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-orders-today"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-student-packages"] });

      if (selectedStudent) {
        setLastOrder({
          studentName: selectedStudent.name,
          isStaff: isStaffStudent(selectedStudent),
          parentLabel: isStaffStudent(selectedStudent)
            ? t("common.staffLabel")
            : selectedStudent.parent?.name ?? t("vendor.newOrder.fallbackParent"),
          lines: cart.map((line, index) => ({
            key: `${line.foodItemId}-${index}`,
            name: line.foodName,
            quantity: line.quantity,
            price: line.kind === "CHARGE" ? line.price : 0,
            packageName: line.kind === "PACKAGE" ? line.packageName : undefined,
          })),
          total: cartTotal,
        });
      }

      setCart([]);
      setError("");
      setSelectedStudentId("");
      setIsStudentPickerOpen(true);
      setStudentSearch("");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : t("vendor.newOrder.errorSendOrder");
      setError(message);
    },
  });

  const acceptOrder = () => {
    if (!selectedStudentId) {
      setError(t("vendor.newOrder.errorSelectStudentFirst"));
      return;
    }
    if (cart.length === 0) {
      setError(t("vendor.newOrder.errorAddOneProduct"));
      return;
    }
    setError("");
    acceptMutation.mutate();
  };

  return (
    <div>
      <Header
        title={t("vendor.newOrder.title")}
        subtitle={t("vendor.newOrder.subtitle")}
      />

      <div className="space-y-4 p-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          {selectedStudent && !isStudentPickerOpen ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                    <UserRound className="h-5 w-5 text-cyan-700" />
                  </div>
                  <div>
                    <p className="flex flex-wrap items-center gap-2 text-lg font-black text-slate-900">
                      <span>{selectedStudent.name}</span>
                      {isStaffStudent(selectedStudent) ? (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                          {t("common.staffLabel")}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs font-semibold text-slate-600">
                      {isStaffStudent(selectedStudent)
                        ? t("common.staffLevelLabel")
                        : `${selectedStudent.level}${selectedStudent.parent?.name ? ` · ${t("vendor.newOrder.guardianLabel")}: ${selectedStudent.parent.name}` : ""}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={changeStudent}
                  className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                >
                  {t("vendor.newOrder.changeStudent")}
                </button>
              </div>

              {selectedStudent.allergies?.trim() ? (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-sm font-semibold text-red-800">
                    {t("vendor.search.allergiesRestrictions")}: {selectedStudent.allergies}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{t("vendor.newOrder.searchStudentByName")}</p>
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder={t("vendor.newOrder.studentNamePlaceholder")}
                  autoFocus
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
                />
              </div>

              {studentSearch.trim() ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {studentsLoading ? (
                    <p className="text-sm text-slate-500">{t("vendor.newOrder.loadingStudents")}</p>
                  ) : filteredStudents.length === 0 ? (
                    <p className="text-sm text-slate-500">{t("vendor.newOrder.noStudentsFound")}</p>
                  ) : (
                    filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => selectStudent(student)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-cyan-300 hover:bg-cyan-50/40"
                      >
                        <p className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
                          <span>{student.name}</span>
                          {isStaffStudent(student) ? (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                              {t("common.staffLabel")}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {isStaffStudent(student) ? t("common.staffLevelLabel") : student.level}
                        </p>
                        {!isStaffStudent(student) && student.parent?.name ? (
                          <p className="mt-0.5 text-xs text-slate-400">{student.parent.name}</p>
                        ) : null}
                        {student.allergies?.trim() ? (
                          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            {student.allergies}
                          </p>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              ) : lastOrder ? (
                <OrderSummaryCard order={lastOrder} t={t} onDismiss={() => setLastOrder(null)} />
              ) : (
                <p className="mt-4 text-sm text-slate-400">{t("vendor.newOrder.searchToStartHint")}</p>
              )}
            </div>
          )}
        </section>

        {selectedStudent && !isStudentPickerOpen && packagesForSelectedStudent.length > 0 ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <Ticket className="h-4 w-4" />
              {t("vendor.newOrder.availablePackagesTitle")}
            </div>
            <div className="mt-2 space-y-1.5">
              {packagesForSelectedStudent.map((sp) => {
                const covers = sp.package.coversSnack
                  ? t("vendor.newOrder.packageCoversSnackText")
                  : sp.package.eligibleItemNames.join(", ");
                return (
                  <div
                    key={sp.id}
                    className={cn(
                      "rounded-xl border px-3 py-2",
                      sp.usedToday ? "border-slate-200 bg-slate-100" : "border-emerald-300 bg-white"
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={cn("flex items-center gap-1.5 text-sm font-bold", sp.usedToday ? "text-slate-500" : "text-emerald-900")}>
                        <Ticket className="h-3.5 w-3.5 shrink-0" />
                        {sp.package.name}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          sp.usedToday ? "bg-slate-300 text-slate-600" : "bg-emerald-500 text-white"
                        )}
                      >
                        {sp.usedToday ? t("vendor.newOrder.packageUsedToday") : t("vendor.newOrder.packageAvailableToday")}
                      </span>
                    </div>
                    {covers ? (
                      <p className="mt-0.5 text-xs text-slate-500">{t("vendor.newOrder.packageCoversLabel")}: {covers}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {selectedStudent && !isStudentPickerOpen && alreadyOrderedToday.length > 0 ? (
          <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 font-bold text-cyan-800">
              <CheckCircle2 className="h-4 w-4" />
              {t("vendor.newOrder.alreadyOrderedTitle")}
            </div>
            <p className="mt-1 text-xs text-cyan-700">{t("vendor.newOrder.alreadyOrderedHint")}</p>
            <ul className="mt-2 space-y-1">
              {alreadyOrderedToday.map((item) => (
                <li key={item.id} className="text-sm font-semibold text-cyan-900">
                  {item.foodItem.name} × {item.quantity}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {selectedStudent && !isStudentPickerOpen ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
            <section className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={menuSearch}
                    onChange={(event) => setMenuSearch(event.target.value)}
                    placeholder={t("vendor.newOrder.searchFoodPlaceholder")}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {FOOD_TABS.map((tab) => {
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
                        <span>{t(tab.labelKey)}</span>
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
                    {t("vendor.newOrder.loadingMenu")}
                  </div>
                ) : filteredMenu.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <p className="text-lg font-semibold text-slate-900">
                      {t("vendor.newOrder.noFoodInTab")}
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMenu.map((item) => {
                      const price = getPriceForStudentLevel(item, selectedStudent.level);
                      const eligiblePackages = eligiblePackagesForFood(item);
                      const isPackageCovered = eligiblePackages.length > 0;

                      return (
                        <article
                          key={item.id}
                          className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
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
                            {isPackageCovered ? (
                              <div className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                                <Ticket className="h-3 w-3" />
                                {t("vendor.newOrder.packageBadge")}
                              </div>
                            ) : null}
                          </div>

                          <div className="relative -mt-4 flex flex-1 flex-col rounded-t-[1.25rem] bg-white px-4 pb-4 pt-3">
                            <DietaryTagBadges rawTags={item.tags} labels={dietaryLabels} />

                            <h4 className="mt-2 line-clamp-2 text-base font-bold leading-tight text-slate-900">
                              {item.name}
                            </h4>

                            <div className="mt-auto flex items-center justify-between border-t border-cyan-100 pt-3">
                              <span className="text-sm font-black text-slate-900">
                                {isPackageCovered
                                  ? t("vendor.newOrder.coveredNoCharge")
                                  : price
                                  ? formatCurrency(price)
                                  : t("vendor.newOrder.noPrice")}
                              </span>
                              <button
                                onClick={() => addToOrder(item)}
                                disabled={!isPackageCovered && !price}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                {t("vendor.newOrder.addToOrder")}
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
                  <h3 className="text-2xl font-black text-slate-900">{t("vendor.newOrder.currentOrder")}</h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">{t("vendor.newOrder.forStudent").replace("{name}", selectedStudent.name)}</p>
              </div>

              <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">
                {cart.length === 0 ? (
                  <div className="px-2 py-10 text-center text-sm text-slate-400">
                    {t("vendor.newOrder.addProductsFromMenu")}
                  </div>
                ) : (
                  cart.map((line, index) =>
                    line.kind === "PACKAGE" ? (
                      <div
                        key={`${line.foodItemId}-${index}`}
                        className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-emerald-900">{line.foodName}</p>
                          <p className="flex items-center gap-1 text-xs text-emerald-700">
                            <Ticket className="h-3 w-3" />
                            {t("vendor.newOrder.coveredByPackage").replace("{package}", line.packageName)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeLine(index)}
                          className="rounded-md p-1 text-red-500 hover:bg-red-50"
                          aria-label={t("vendor.newOrder.removeItemLabel").replace("{name}", line.foodName)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        key={`${line.foodItemId}-${index}`}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">{line.foodName}</p>
                          <p className="text-xs text-slate-500">{formatCurrency(line.price)} {t("vendor.newOrder.perUnit")}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => changeQuantity(line.foodItemId, -1)}
                            className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
                            aria-label={t("vendor.newOrder.removeUnitLabel").replace("{name}", line.foodName)}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-sm font-bold text-slate-800">
                            {line.quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(line.foodItemId, 1)}
                            className="rounded-md border border-slate-200 bg-white p-1 text-slate-500 hover:bg-slate-100"
                            aria-label={t("vendor.newOrder.addUnitLabel").replace("{name}", line.foodName)}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeLine(index)}
                          className="rounded-md p-1 text-red-500 hover:bg-red-50"
                          aria-label={t("vendor.newOrder.removeItemLabel").replace("{name}", line.foodName)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  )
                )}
              </div>

              <div className="border-t border-slate-100 px-5 py-4">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="text-lg font-black text-slate-800">{t("vendor.newOrder.total")}</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900">{formatCurrency(cartTotal)}</p>
                    <p className="text-[11px] font-semibold text-slate-500">{cartUnits} {t("vendor.newOrder.units")}</p>
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
                  {acceptMutation.isPending ? t("vendor.newOrder.sendingEllipsis") : t("vendor.newOrder.acceptAndSend")}
                </button>

                <p className="mt-3 text-xs text-slate-500">
                  {t("vendor.newOrder.chargeNote")}
                </p>
              </div>
            </aside>
          </div>
        ) : null}
      </div>

      {packageChoice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">
                {t("vendor.newOrder.choosePackageTitle").replace("{name}", packageChoice.food.name)}
              </h2>
              <button onClick={() => setPackageChoice(null)} className="rounded-lg p-1.5 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <div className="space-y-2 p-5">
              {packageChoice.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    addPackageLine(packageChoice.food, option);
                    setPackageChoice(null);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:border-cyan-300 hover:bg-cyan-50/40"
                >
                  <span>{option.package.name}</span>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setPackageChoice(null)}
                className="w-full rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("vendor.newOrder.choosePackageCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrderSummaryCard({
  order,
  t,
  onDismiss,
}: {
  order: OrderSummary;
  t: (key: string) => string;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          {t("vendor.newOrder.orderSentTitle")}
        </div>
        <button
          onClick={onDismiss}
          className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100"
          aria-label={t("vendor.newOrder.closeNotice")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-2 text-lg font-black text-slate-900">
        <span>{order.studentName}</span>
        {order.isStaff ? (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
            {t("common.staffLabel")}
          </span>
        ) : null}
      </p>
      {!order.isStaff ? (
        <p className="text-xs font-semibold text-emerald-700">
          {t("vendor.newOrder.guardianLabel")}: {order.parentLabel}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5">
        {order.lines.map((line) => (
          <li key={line.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-800">
              • {line.name} × {line.quantity}
              {line.packageName ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <Ticket className="h-3 w-3" />
                  {line.packageName}
                </span>
              ) : null}
            </span>
            {!line.packageName ? (
              <span className="shrink-0 font-semibold text-slate-600">{formatCurrency(line.price * line.quantity)}</span>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-emerald-200 pt-3 text-sm font-black text-slate-900">
        {t("vendor.newOrder.total")}
        <span>{formatCurrency(order.total)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-emerald-700">{t("vendor.newOrder.searchNextHint")}</p>
        <Link
          href="/vendor/orders"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          {t("vendor.newOrder.viewInTodayOrders")}
        </Link>
      </div>
    </div>
  );
}

function VendorNewOrderLoading() {
  const t = useTranslations();
  return (
    <div>
      <Header
        title={t("vendor.newOrder.title")}
        subtitle={t("vendor.newOrder.subtitle")}
      />
      <div className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          {t("vendor.newOrder.loadingEllipsis")}
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
