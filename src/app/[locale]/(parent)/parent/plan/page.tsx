"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "@/components/dashboard/Header";
import DietaryTagBadges, { DietaryTagLabels } from "@/components/dashboard/DietaryTagBadges";
import { formatCurrency, formatDateTime, LEVELS, normalizePriceLevel } from "@/lib/utils";
import { FOOD_TABS, getFoodTab, parseFoodTags, type FoodTab } from "@/lib/food-tabs";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";
import { CalendarDays, Pencil, Plus, Search, ShoppingCart, Trash2, UtensilsCrossed, X } from "lucide-react";

type Student = {
  id: string;
  name: string;
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

const studentLevelLabelByValue = Object.fromEntries(
  LEVELS.map((level) => [level.value, level.label])
) as Record<string, string>;

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

function subscribeNoop() {
  return () => {};
}

function BodyPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  if (!mounted) return null;

  return createPortal(children, document.body);
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
  const locale = useLocale();
  const t = useTranslations();
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FoodTab>("GENERAL");
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);
  const [pendingFoodToAdd, setPendingFoodToAdd] = useState<FoodItem | null>(null);
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false);
  const [isCartMenuOpen, setIsCartMenuOpen] = useState(false);

  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("12:00");
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [formError, setFormError] = useState("");

  const dietaryLabels: DietaryTagLabels = {
    GLUTEN_FREE: t("dietaryTags.glutenFree"),
    LACTOSE_FREE: t("dietaryTags.lactoseFree"),
    VEGETARIAN: t("dietaryTags.vegetarian"),
  };

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

  // Staff accounts see themselves in the list; wording switches from
  // "child" to the neutral "person" strings for them.
  const hasStaffSelf = useMemo(() => students.some(isStaffStudent), [students]);

  // A staff member with no children only has their own profile — select it
  // automatically so the picker never opens for them.
  const onlyStaffSelf =
    activeStudents.length === 1 && isStaffStudent(activeStudents[0]);

  const effectiveStudentId =
    studentId || (onlyStaffSelf ? activeStudents[0].id : "");

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === effectiveStudentId),
    [students, effectiveStudentId]
  );

  const mustChooseStudent = !selectedStudent;
  const isStudentPickerVisible = isStudentPickerOpen || (!studentsLoading && mustChooseStudent);

  const today = useMemo(() => new Date(), []);
  const todayValue = useMemo(() => toDateOnlyValue(today), [today]);

  const draftDateValue = draftDate || todayValue;

  const filteredMenu = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return menu
      .filter((item) => item.available)
      .filter((item) => {
        if (!normalizedSearch) return true;
        const tags = parseFoodTags(item.tags).join(" ").toLowerCase();
        return (
          item.name.toLowerCase().includes(normalizedSearch) ||
          (item.description ?? "").toLowerCase().includes(normalizedSearch) ||
          item.category.name.toLowerCase().includes(normalizedSearch) ||
          tags.includes(normalizedSearch)
        );
      })
      .filter((item) => getFoodTab(item) === activeTab);
  }, [menu, search, activeTab]);

  const tabCounts = useMemo(() => {
    const counts: Record<FoodTab, number> = {
      GENERAL: 0,
      DRINKS: 0,
      CASADOS: 0,
    };

    for (const item of menu) {
      if (!item.available) continue;
      counts[getFoodTab(item)] += 1;
    }

    return counts;
  }, [menu]);

  const addFoodToDraftForStudent = (food: FoodItem, student: Student) => {
    if (!student.active) {
      setFormError(t("parent.plan.errorStudentInactive"));
      return;
    }

    const selectedPrice = getPriceForStudentLevel(food, student.level);

    if (!selectedPrice || selectedPrice <= 0) {
      setFormError(t("parent.plan.errorNoPriceForLevel"));
      return;
    }

    setFormError("");

    setDraftItems((current) => {
      return [
        ...current,
        {
          foodItemId: food.id,
          foodName: food.name,
          categoryName: food.category.name,
          quantity: 1,
          price: selectedPrice,
        },
      ];
    });

    setPendingFoodToAdd(null);
    setIsStudentPickerOpen(false);
  };

  const addFoodToDraft = (food: FoodItem) => {
    if (!effectiveStudentId || !selectedStudent) {
      setPendingFoodToAdd(food);
      setIsStudentPickerOpen(true);
      setFormError("");
      return;
    }

    addFoodToDraftForStudent(food, selectedStudent);
  };

  const saveDraftToCart = () => {
    if (!effectiveStudentId || !selectedStudent) {
      setFormError(
        t(hasStaffSelf ? "parent.plan.errorSelectPersonBeforeSave" : "parent.plan.errorSelectChildBeforeSave")
      );
      return;
    }

    if (draftItems.length === 0) {
      setFormError(t("parent.plan.errorAddOneProduct"));
      return;
    }

    if (!draftDateValue) {
      setFormError(t("parent.plan.errorSelectDate"));
      return;
    }

    if (!draftTime) {
      setFormError(t("parent.plan.errorSelectTime"));
      return;
    }

    const nextScheduledDate = buildScheduledDate(draftDateValue, draftTime);
    const parsed = new Date(nextScheduledDate);

    if (Number.isNaN(parsed.getTime())) {
      setFormError(t("parent.plan.errorInvalidDateTime"));
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
    setPendingFoodToAdd(null);
    setFormError("");
  };

  const clearDraftLine = () => {
    setDraftItems([]);
    setEditingLineId(null);
    setPendingFoodToAdd(null);
    setFormError("");
  };

  const removeItemFromDraft = (itemIndex: number) => {
    setDraftItems((current) => current.filter((_, index) => index !== itemIndex));
  };

  const editLineFromCart = (lineId: string) => {
    if (editingLineId === lineId) return;

    if (draftItems.length > 0) {
      setFormError(t("parent.plan.errorEditingLine"));
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

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

  const openStudentPicker = () => {
    const hasCartContent = draftItems.length > 0 || cartLines.length > 0;

    if (hasCartContent) {
      const confirmed = window.confirm(
        t(hasStaffSelf ? "parent.plan.confirmChangePerson" : "parent.plan.confirmChangeChild")
      );

      if (!confirmed) return;

      setCartLines([]);
      setDraftItems([]);
      setEditingLineId(null);
    }

    setPendingFoodToAdd(null);
    setIsStudentPickerOpen(true);
    setFormError("");
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

      return response.data as { id: string; total: number }[];
    },
    onSuccess: (createdOrders) => {
      queryClient.invalidateQueries({ queryKey: ["parent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["parent-balance"] });
      setCartLines([]);
      setDraftItems([]);
      setEditingLineId(null);
      setPendingFoodToAdd(null);
      setFormError("");

      const total = createdOrders.reduce((sum, order) => sum + order.total, 0);
      const ids = createdOrders.map((order) => order.id).join(",");
      router.push(
        `/${locale}/parent/history?created=1&total=${total}&ids=${encodeURIComponent(ids)}`
      );
    },
    onError: (error) => {
      const message =
        axios.isAxiosError(error) && error.response?.data?.error
          ? String(error.response.data.error)
          : t("parent.plan.errorCreateOrder");
      setFormError(message);
    },
  });

  const submitAllOrders = () => {
    if (draftItems.length > 0) {
      setFormError(t("parent.plan.errorEditingLineSubmit"));
      return;
    }

    if (cartLines.length === 0 || orderMutation.isPending) return;

    setFormError("");
    orderMutation.mutate(cartLines);
  };

  const renderCartLines = () => (
    <div className="max-h-[540px] space-y-3 overflow-y-auto p-3">
      {draftItems.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-900">
            {t("parent.plan.editingLineNotice")}
          </p>
        </div>
      ) : null}

      {cartLines.length === 0 ? (
        <div className="px-2 py-10 text-center text-sm text-slate-400">
          {t("parent.plan.noLinesYet")}
        </div>
      ) : (
        cartLines.map((line) => (
          <div key={line.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-bold text-cyan-700">{formatDateTime(line.scheduledDate)}</p>
            </div>

            <div className="space-y-2 px-3 py-3">
              {line.items.map((item, itemIndex) => (
                <div
                  key={`${line.id}-${item.foodItemId}-${itemIndex}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
                >
                  <p className="text-sm font-semibold leading-snug text-slate-700">{item.foodName}</p>
                  <span className="text-sm font-bold text-slate-700">
                    {formatCurrency(item.price)}
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
                {t("parent.plan.editLine")}
              </button>

              <button
                onClick={() => editLineFromCart(line.id)}
                className="inline-flex items-center gap-1 text-cyan-700 hover:text-cyan-800"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("parent.plan.addProduct")}
              </button>

              <button
                onClick={() => removeLineFromCart(line.id)}
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("parent.plan.removeLine")}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderCartSummary = () => (
    <div className="border-t border-slate-100 px-5 py-4">
      <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
        <span className="text-xl font-black text-slate-800">{t("parent.plan.totalGeneral")}</span>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900">{formatCurrency(savedTotal)}</p>
          <p className="text-[11px] font-semibold text-slate-500">{savedUnits} {t("parent.plan.units")}</p>
        </div>
      </div>

      {formError ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

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
        {orderMutation.isPending ? t("parent.plan.sending") : t("parent.plan.submitOrder")}
      </button>

      <p className="mt-3 text-xs text-slate-500">
        {t("parent.plan.balanceNote")}
      </p>
    </div>
  );

  return (
    <div>
      <div className="hidden sm:block">
        <Header
          title={t("parent.plan.headerTitle")}
          subtitle={t("parent.plan.headerSubtitle")}
        />
      </div>

      <BodyPortal>
      <button
        type="button"
        onClick={() => setIsCartMenuOpen((current) => !current)}
        className="fixed right-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 sm:hidden"
        aria-label={t("parent.plan.openCart")}
      >
        <ShoppingCart className="h-5 w-5" />
        {savedUnits > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-cyan-600 px-1 text-[10px] font-bold text-white">
            {savedUnits}
          </span>
        ) : null}
      </button>

      {isCartMenuOpen ? (
        <>
          <button
            type="button"
            onClick={() => setIsCartMenuOpen(false)}
            aria-label={t("parent.plan.closeCart")}
            className="fixed inset-0 z-40 cursor-default sm:hidden"
          />
          <div className="fixed left-3 right-3 top-16 z-50 mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-black text-slate-900">{t("parent.plan.cart")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartMenuOpen(false)}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                aria-label={t("parent.plan.closeCart")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderCartLines()}
            {renderCartSummary()}
          </div>
        </>
      ) : null}
      </BodyPortal>

      <div
        className={`space-y-4 px-3 pt-16 sm:space-y-6 sm:px-6 sm:pt-6 ${
          draftItems.length > 0 ? "pb-56 sm:pb-44" : "pb-20"
        }`}
      >
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-2xl font-black text-slate-900">
                  <span>
                    {selectedStudent
                      ? selectedStudent.name
                      : t(hasStaffSelf ? "parent.plan.noPersonSelected" : "parent.plan.noChildSelected")}
                  </span>
                  {selectedStudent && isStaffStudent(selectedStudent) ? (
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-700">
                      {t("common.staffLabel")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs font-semibold text-slate-600">
                  {selectedStudent
                    ? isStaffStudent(selectedStudent)
                      ? t("common.staffLevelLabel")
                      : studentLevelLabelByValue[selectedStudent.level] ?? selectedStudent.level
                    : t(hasStaffSelf ? "parent.plan.pressAddHintPerson" : "parent.plan.pressAddHint")}
                </p>
              </div>

              {!onlyStaffSelf ? (
                <button
                  onClick={openStudentPicker}
                  className="rounded-xl border border-cyan-300 bg-white px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
                >
                  {selectedStudent
                    ? t(hasStaffSelf ? "parent.plan.changePerson" : "parent.plan.changeChild")
                    : t(hasStaffSelf ? "parent.plan.choosePerson" : "parent.plan.chooseChild")}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder={t("parent.plan.searchFoodPlaceholder")}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-cyan-400 focus:bg-white"
            />
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
          <section className="space-y-4">
            {studentsLoading || menuLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
                {t("parent.plan.loadingMenuStudents")}
              </div>
            ) : (
              <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {FOOD_TABS.map((tab) => {
                    const isActive = tab.key === activeTab;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.key);
                        }}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "border-cyan-500 bg-cyan-500 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                        }`}
                      >
                        <span>{t(tab.labelKey)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isActive
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tabCounts[tab.key]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {filteredMenu.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <p className="text-lg font-semibold text-slate-900">
                      {t("parent.plan.noFoodInTab")}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {t("parent.plan.tryAnotherTabOrSearch")}
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredMenu.map((item) => {
                        const selectedPrice = selectedStudent
                          ? getPriceForStudentLevel(item, selectedStudent.level)
                          : null;

                        return (
                          <article
                            key={item.id}
                            className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                          >
                            <div className="relative h-36 overflow-hidden bg-gradient-to-br from-cyan-50 to-slate-100 text-5xl">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  unoptimized
                                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <span className="flex h-full items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                  🍽️
                                </span>
                              )}

                              <div className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-800 shadow-sm backdrop-blur-sm">
                                <UtensilsCrossed className="h-5 w-5" />
                              </div>
                            </div>

                            <div className="relative -mt-4 flex flex-1 flex-col rounded-t-[1.25rem] bg-white px-4 pb-4 pt-3">
                              <DietaryTagBadges rawTags={item.tags} labels={dietaryLabels} />

                              <h4 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-slate-900">
                                {item.name}
                              </h4>
                              {item.description ? (
                                <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-500">{item.description}</p>
                              ) : null}

                              <div className="mt-auto pt-3">
                                <div className="border-t border-cyan-100 pt-3">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">
                                      {selectedStudent
                                        ? isStaffStudent(selectedStudent)
                                          ? t("common.staffLevelLabel")
                                          : studentLevelLabelByValue[selectedStudent.level] ?? selectedStudent.level
                                        : t(hasStaffSelf ? "parent.plan.choosePerson" : "parent.plan.chooseChild")}
                                    </span>
                                    <span className="font-semibold text-slate-900">
                                      {selectedPrice ? formatCurrency(selectedPrice) : "-"}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => addFoodToDraft(item)}
                                  disabled={Boolean(selectedStudent && !selectedPrice)}
                                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                  {t("parent.plan.add")}
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-20">
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-slate-700" />
                <h3 className="text-3xl font-black text-slate-900">{t("parent.plan.cart")}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">{t("parent.plan.cartOrganized")}</p>
              <p className="mt-1 text-sm text-slate-500">
                {t("parent.plan.cartHint")}
              </p>
            </div>

            {renderCartLines()}
            {renderCartSummary()}
          </aside>
        </div>

        {draftItems.length > 0 ? (
          <BodyPortal>
          <div
            className="fixed inset-x-0 z-50 flex justify-center px-2 xl:pl-64"
            style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="relative w-full max-w-6xl rounded-2xl border border-cyan-200/80 bg-cyan-50/95 p-3 shadow-[0_24px_56px_rgba(8,47,73,0.30)] ring-1 ring-cyan-100 backdrop-blur-md">
              {selectedStudent ? (
                <span className="absolute -top-2.5 left-3 rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:hidden">
                  {selectedStudent.name.split(" ")[0]}
                </span>
              ) : null}

              {formError ? (
                <div className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    {draftItems.slice(0, 4).map((item, index) => (
                      <span
                        key={`${item.foodItemId}-${index}`}
                        className="inline-flex max-w-[220px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700"
                      >
                        <span className="truncate">{item.foodName}</span>
                        <button
                          onClick={() => removeItemFromDraft(index)}
                          className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          aria-label={t("parent.plan.removeItemLabel").replace("{item}", item.foodName)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {draftItems.length > 4 ? (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        +{draftItems.length - 4} {t("parent.plan.more")}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-600">
                    {draftUnits} {t("parent.plan.productsUnits")} - {formatCurrency(draftTotal)}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3 lg:shrink-0">
                  <label className="min-w-0 sm:w-56">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-700">{t("parent.plan.dateTime")}</span>
                    <button
                      type="button"
                      onClick={() => setIsDateTimePickerOpen(true)}
                      className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-cyan-300"
                    >
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {formatDateTime(buildScheduledDate(draftDateValue, draftTime))}
                      </span>
                    </button>
                  </label>

                  <button
                    onClick={saveDraftToCart}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-white hover:bg-cyan-600"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {t("parent.plan.addLine")}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center justify-end gap-2 text-xs">
                <button
                  onClick={clearDraftLine}
                  className="font-semibold text-slate-600 hover:text-slate-900"
                >
                  {t("parent.plan.clear")}
                </button>
              </div>
            </div>
          </div>
          </BodyPortal>
        ) : null}

        {isDateTimePickerOpen ? (
          <BodyPortal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">{t("parent.plan.dateTimeModalTitle")}</h3>
                <button
                  onClick={() => setIsDateTimePickerOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">{t("parent.plan.date")}</span>
                  <input
                    type="date"
                    min={todayValue}
                    value={draftDateValue}
                    onChange={(event) => setDraftDate(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-700">{t("parent.plan.time")}</span>
                  <input
                    type="time"
                    step={300}
                    value={draftTime}
                    onChange={(event) => setDraftTime(event.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  />
                </label>
              </div>

              <button
                onClick={() => setIsDateTimePickerOpen(false)}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600"
              >
                {t("parent.plan.done")}
              </button>
            </div>
          </div>
          </BodyPortal>
        ) : null}

        {isStudentPickerVisible ? (
          <BodyPortal>
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {t(hasStaffSelf ? "parent.plan.choosePersonModalTitle" : "parent.plan.chooseChildModalTitle")}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {pendingFoodToAdd
                      ? t("parent.plan.willAdd").replace("{food}", pendingFoodToAdd.name)
                      : t(hasStaffSelf ? "parent.plan.selectPersonToContinue" : "parent.plan.selectChildToContinue")}
                  </p>
                </div>
                {!mustChooseStudent ? (
                  <button
                    onClick={() => {
                      setIsStudentPickerOpen(false);
                      setPendingFoodToAdd(null);
                    }}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    aria-label={t("parent.plan.closeChildPicker")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {studentsLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {t("parent.plan.loadingChildren")}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => {
                        setStudentId(student.id);
                        if (pendingFoodToAdd) {
                          addFoodToDraftForStudent(pendingFoodToAdd, student);
                          return;
                        }
                        setIsStudentPickerOpen(false);
                      }}
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
                        {isStaffStudent(student)
                          ? t("common.staffSelfHint")
                          : studentLevelLabelByValue[student.level] ?? student.level}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          </BodyPortal>
        ) : null}
      </div>
    </div>
  );
}
