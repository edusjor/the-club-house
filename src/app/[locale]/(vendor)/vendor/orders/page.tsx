"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Link from "@/i18n/Link";
import { cn, formatOrderNumber } from "@/lib/utils";
import { useTranslations } from "@/i18n/I18nProvider";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Play,
  Search,
  Store,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  delivered: boolean;
  scheduledDate: string;
  student: { name: string; level: string };
  foodItem: { name: string };
};

type Order = {
  id: string;
  status: string;
  total: number;
  source: string;
  parent: { name: string };
  items: OrderItem[];
};

type OrderWithTime = Order & { time: Date };
type Bucket = {
  key: number;
  label: string;
  orders: OrderWithTime[];
  totalPlates: number;
  topFoods: [string, number][];
};

const EMPTY_ORDERS: Order[] = [];
const FINISHED_STATUSES = new Set(["DELIVERED", "NOT_PICKED_UP", "CANCELLED"]);

// A "bucket" of 0 means don't split the day into time windows at all.
const BUCKET_OPTIONS = [
  { minutes: 15, labelKey: "bucket15" },
  { minutes: 30, labelKey: "bucket30" },
  { minutes: 60, labelKey: "bucket60" },
  { minutes: 0, labelKey: "bucketAllDay" },
] as const;

const FOOD_DOT_STYLES = [
  { emoji: "🍚", className: "bg-amber-100" },
  { emoji: "🥗", className: "bg-emerald-100" },
  { emoji: "🍞", className: "bg-orange-100" },
  { emoji: "🥤", className: "bg-sky-100" },
  { emoji: "🥞", className: "bg-yellow-100" },
  { emoji: "🍲", className: "bg-rose-100" },
];

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function minutesToLabel(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const suffix = hours < 12 ? "a.m." : "p.m.";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${`${mins}`.padStart(2, "0")} ${suffix}`;
}

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function foodDotStyle(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FOOD_DOT_STYLES[hash % FOOD_DOT_STYLES.length];
}

export default function VendorOrdersPage() {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [dateValue, setDateValue] = useState(() => toDateInputValue(new Date()));
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [bucketMinutes, setBucketMinutes] = useState(30);
  const [selectedBucketKey, setSelectedBucketKey] = useState<number | null>(null);
  const [showFinished, setShowFinished] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const { data: orders = EMPTY_ORDERS, isLoading } = useQuery<Order[]>({
    queryKey: ["vendor-orders", dateValue],
    queryFn: () => axios.get(`/api/orders?date=${dateValue}`).then((response) => response.data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["vendor-orders", dateValue] });

  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      setPendingOrderId(orderId);
      await axios.put(`/api/orders/${orderId}`, { status });
    },
    onSuccess: () => {
      invalidate();
      setError("");
    },
    onError: (mutationError: unknown) => {
      const message =
        axios.isAxiosError(mutationError) && mutationError.response?.data?.error
          ? String(mutationError.response.data.error)
          : t("vendor.orders.errorUpdateOrder");
      setError(message);
    },
    onSettled: () => setPendingOrderId(null),
  });

  const bulkAcceptMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      await Promise.all(orderIds.map((orderId) => axios.put(`/api/orders/${orderId}`, { status: "PREPARING" })));
    },
    onSuccess: () => {
      invalidate();
      setError("");
    },
    onError: () => setError(t("vendor.orders.errorBulkAccept")),
  });

  const ordersWithTime = useMemo<OrderWithTime[]>(() => {
    return orders
      .map((order) => ({
        ...order,
        time: order.items[0] ? new Date(order.items[0].scheduledDate) : null,
      }))
      .filter((order): order is OrderWithTime => order.time !== null)
      .sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [orders]);

  const normalizedQuery = normalizeToken(search.trim());
  const isSearching = normalizedQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    return ordersWithTime.filter(
      (order) =>
        order.items.some((item) => normalizeToken(item.student.name).includes(normalizedQuery)) ||
        normalizeToken(order.parent.name).includes(normalizedQuery) ||
        formatOrderNumber(order.id).toLowerCase().includes(normalizedQuery)
    );
  }, [ordersWithTime, normalizedQuery, isSearching]);

  const buckets = useMemo<Bucket[]>(() => {
    const groups = new Map<number, OrderWithTime[]>();

    for (const order of ordersWithTime) {
      const orderMinutes = minutesSinceMidnight(order.time);
      const bucketStart =
        bucketMinutes > 0 ? Math.floor(orderMinutes / bucketMinutes) * bucketMinutes : 0;
      const existing = groups.get(bucketStart);
      if (existing) existing.push(order);
      else groups.set(bucketStart, [order]);
    }

    return [...groups.entries()]
      .sort(([a], [b]) => a - b)
      .map(([bucketStart, bucketOrders]) => {
        const foodCounts = new Map<string, number>();
        let totalPlates = 0;

        for (const order of bucketOrders) {
          for (const item of order.items) {
            totalPlates += item.quantity;
            foodCounts.set(item.foodItem.name, (foodCounts.get(item.foodItem.name) ?? 0) + item.quantity);
          }
        }

        return {
          key: bucketStart,
          label:
            bucketMinutes > 0
              ? `${minutesToLabel(bucketStart)} - ${minutesToLabel(bucketStart + bucketMinutes)}`
              : t("vendor.orders.bucketAllDay"),
          orders: bucketOrders,
          totalPlates,
          topFoods: [...foodCounts.entries()].sort(([, a], [, b]) => b - a),
        };
      });
  }, [ordersWithTime, bucketMinutes, t]);

  const activeBucket = buckets.find((bucket) => bucket.key === selectedBucketKey) ?? buckets[0] ?? null;
  const activeBucketOrders = activeBucket?.orders ?? [];
  const activeInBucket = activeBucketOrders.filter((order) => !FINISHED_STATUSES.has(order.status));
  const finishedInBucket = activeBucketOrders.filter((order) => FINISHED_STATUSES.has(order.status));
  const acceptAllIds = activeInBucket.filter((order) => order.status === "PAID").map((order) => order.id);

  function shiftDate(delta: number) {
    setDateValue((prev) => {
      const [year, month, day] = prev.split("-").map(Number);
      const base = new Date(year, (month || 1) - 1, day || 1);
      base.setDate(base.getDate() + delta);
      return toDateInputValue(base);
    });
  }

  function selectBucket(key: number) {
    setSelectedBucketKey(key);
    setShowFinished(false);
  }

  function accept(orderId: string) {
    statusMutation.mutate({ orderId, status: "PREPARING" });
  }

  function serve(orderId: string) {
    statusMutation.mutate({ orderId, status: "DELIVERED" });
  }

  function markNotPickedUp(orderId: string) {
    statusMutation.mutate({ orderId, status: "NOT_PICKED_UP" });
  }

  const rowActions = { accept, serve, markNotPickedUp, pendingOrderId, t };

  const searchActive = isSearching ? searchResults.filter((o) => !FINISHED_STATUSES.has(o.status)) : [];
  const searchFinished = isSearching ? searchResults.filter((o) => FINISHED_STATUSES.has(o.status)) : [];

  return (
    <div>
      <Header title={t("vendor.orders.title")} subtitle={t("vendor.orders.subtitle")} />
      <div className="space-y-4 p-4 sm:p-6">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shiftDate(-1)}
              className="flex h-10 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={dateValue}
              onChange={(event) => setDateValue(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2 text-sm"
            />
            <button
              onClick={() => shiftDate(1)}
              className="flex h-10 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("vendor.orders.searchPlaceholder")}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm"
            />
          </div>

          {!isSearching ? (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              {t("vendor.orders.groupEvery")}
              <select
                value={bucketMinutes}
                onChange={(event) => setBucketMinutes(Number(event.target.value))}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
              >
                {BUCKET_OPTIONS.map((option) => (
                  <option key={option.minutes} value={option.minutes}>
                    {t(`vendor.orders.${option.labelKey}`)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <Link
            href="/vendor/new-order"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-bold text-white shadow-sm hover:bg-cyan-600"
          >
            <UtensilsCrossed className="h-4 w-4" />
            {t("vendor.orders.newOrder")}
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            {t("vendor.orders.loadingOrders")}
          </div>
        ) : isSearching ? (
          /* Search cuts across the whole day, so it ignores buckets entirely. */
          <OrderListSection
            active={searchActive}
            finished={searchFinished}
            showFinished={true}
            onToggleFinished={() => {}}
            emptyLabel={t("vendor.orders.noOrdersMatchSearch")}
            {...rowActions}
          />
        ) : buckets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            {t("vendor.orders.noOrdersForDay")}
          </div>
        ) : (
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <aside className="flex gap-2 overflow-x-auto md:w-44 md:shrink-0 md:flex-col md:overflow-visible xl:w-52">
              {buckets.map((bucket) => (
                <BucketNavItem
                  key={bucket.key}
                  bucket={bucket}
                  active={bucket.key === activeBucket?.key}
                  onClick={() => selectBucket(bucket.key)}
                  t={t}
                />
              ))}
            </aside>

            <section className="min-w-0 flex-1 space-y-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{activeBucket?.label}</h3>
                    <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700">
                      {activeBucketOrders.length} {t("vendor.orders.ordersCount")}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                      {activeBucket?.totalPlates ?? 0} {t("vendor.orders.platesCount")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {acceptAllIds.length > 0 ? (
                      <button
                        onClick={() => bulkAcceptMutation.mutate(acceptAllIds)}
                        disabled={bulkAcceptMutation.isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Play className="h-3.5 w-3.5" />
                        {t("vendor.orders.acceptAll").replace("{count}", String(acceptAllIds.length))}
                      </button>
                    ) : null}
                    <button
                      onClick={() => setShowSummary((prev) => !prev)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      {showSummary ? t("vendor.orders.hideSummary") : t("vendor.orders.viewProductionSummary")}
                    </button>
                  </div>
                </div>
              </div>

              <OrderListSection
                active={activeInBucket}
                finished={finishedInBucket}
                showFinished={showFinished}
                onToggleFinished={() => setShowFinished((prev) => !prev)}
                emptyLabel={t("vendor.orders.noPendingOrdersInRange")}
                {...rowActions}
              />
            </section>

            {showSummary ? (
              <aside className="md:w-64 md:shrink-0 xl:w-72">
                <ProductionSummaryPanel bucket={activeBucket} t={t} />
              </aside>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderListSection({
  active,
  finished,
  showFinished,
  onToggleFinished,
  emptyLabel,
  accept,
  serve,
  markNotPickedUp,
  pendingOrderId,
  t,
}: {
  active: OrderWithTime[];
  finished: OrderWithTime[];
  showFinished: boolean;
  onToggleFinished: () => void;
  emptyLabel: string;
  accept: (orderId: string) => void;
  serve: (orderId: string) => void;
  markNotPickedUp: (orderId: string) => void;
  pendingOrderId: string | null;
  t: (key: string) => string;
}) {
  return (
    <>
      {active.length > 0 ? (
        <div className="space-y-2">
          {active.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              busy={pendingOrderId === order.id}
              onAccept={() => accept(order.id)}
              onServe={() => serve(order.id)}
              onNotPickedUp={() => markNotPickedUp(order.id)}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {emptyLabel}
        </div>
      )}

      {finished.length > 0 ? (
        <div className="space-y-2">
          <button
            onClick={onToggleFinished}
            className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            {showFinished ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t("vendor.orders.dispatchedCollapse").replace("{count}", String(finished.length))}
          </button>

          {showFinished ? (
            <div className="space-y-2 opacity-70">
              {finished.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  busy={pendingOrderId === order.id}
                  onAccept={() => accept(order.id)}
                  onServe={() => serve(order.id)}
                  onNotPickedUp={() => markNotPickedUp(order.id)}
                  t={t}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function OrderRow({
  order,
  busy,
  onAccept,
  onServe,
  onNotPickedUp,
  t,
}: {
  order: OrderWithTime;
  busy: boolean;
  onAccept: () => void;
  onServe: () => void;
  onNotPickedUp: () => void;
  t: (key: string) => string;
}) {
  const isVendorOrder = order.source === "VENDOR";
  const isStaffOrder =
    order.items.length > 0 && order.items.every((item) => item.student.level === "STAFF");
  const studentNames = [...new Set(order.items.map((item) => item.student.name))];

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="shrink-0 text-xs font-semibold text-slate-400">{formatTime(order.time)}</span>
        <span className="shrink-0 text-base font-black text-slate-900">
          {isStaffOrder ? "🧑‍🏫" : "🧒"} {studentNames.join(", ")}
        </span>
        {isStaffOrder ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
            {t("common.staffLabel")}
          </span>
        ) : null}
        <span className="shrink-0 text-xs text-slate-400">#{formatOrderNumber(order.id)}</span>
        {isVendorOrder ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
            <Store className="h-3 w-3" />
            {t("vendor.orders.restaurant")}
          </span>
        ) : null}

        <span className="ml-auto shrink-0">
          <OrderStatusPill status={order.status} t={t} />
        </span>

        {order.status === "PAID" ? (
          <button
            onClick={onAccept}
            disabled={busy}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500 px-3 text-xs font-bold text-white hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            {busy ? t("vendor.orders.acceptingEllipsis") : t("vendor.orders.acceptOrder")}
          </button>
        ) : null}

        {order.status === "PREPARING" ? (
          <>
            <button
              onClick={onNotPickedUp}
              disabled={busy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {t("vendor.orders.notPickedUp")}
            </button>
            <button
              onClick={onServe}
              disabled={busy}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 text-xs font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {busy ? t("vendor.orders.markingEllipsis") : t("vendor.orders.served")}
            </button>
          </>
        ) : null}
      </div>

      {!isStaffOrder ? (
        <p className="mt-1 text-xs font-medium text-slate-400">{t("vendor.orders.parentLabel")}: {order.parent.name}</p>
      ) : null}
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {order.items.map((item) => (
          <span key={item.id} className="text-xs font-semibold text-slate-700">
            • {item.foodItem.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function OrderStatusPill({ status, t }: { status: string; t: (key: string) => string }) {
  if (status === "DELIVERED" || status === "NOT_PICKED_UP" || status === "CANCELLED") {
    return <StatusBadge status={status} className="text-xs px-2.5 py-1" />;
  }

  if (status === "PREPARING") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
        <Play className="h-3.5 w-3.5" />
        {t("vendor.orders.acceptedInKitchen")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">
      {t("vendor.orders.pendingAcceptance")}
    </span>
  );
}

function FoodDot({ name }: { name: string }) {
  const style = foodDotStyle(name);
  return (
    <span
      title={name}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ring-1 ring-white",
        style.className
      )}
    >
      {style.emoji}
    </span>
  );
}

function BucketNavItem({
  bucket,
  active,
  onClick,
  t,
}: {
  bucket: Bucket;
  active: boolean;
  onClick: () => void;
  t: (key: string) => string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-44 shrink-0 rounded-xl border p-2.5 text-left transition-colors md:w-full",
        active ? "border-cyan-300 bg-cyan-50/60 ring-1 ring-cyan-200" : "border-slate-200 bg-white hover:bg-slate-50"
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
        <Clock3 className="h-3.5 w-3.5 text-cyan-600" />
        {bucket.label}
      </div>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        {bucket.orders.length} {t("vendor.orders.ordersCount")} · {bucket.totalPlates} {t("vendor.orders.platesCount")}
      </p>
      {bucket.topFoods.length > 0 ? (
        <div className="mt-1.5 flex -space-x-1">
          {bucket.topFoods.slice(0, 4).map(([name]) => (
            <FoodDot key={name} name={name} />
          ))}
        </div>
      ) : null}
    </button>
  );
}

function ProductionSummaryPanel({ bucket, t }: { bucket: Bucket | null; t: (key: string) => string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
        <BarChart3 className="h-4 w-4 text-cyan-600" />
        {t("vendor.orders.productionSummary")}
      </div>
      {bucket ? (
        <>
          <p className="mt-1 text-xs font-semibold text-cyan-700">{bucket.label}</p>
          {bucket.topFoods.length > 0 ? (
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {bucket.topFoods.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                    <FoodDot name={name} />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="shrink-0 font-black text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">{t("vendor.orders.noFoodInRange")}</p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-black text-slate-900">
            {t("vendor.orders.totalPlates")}
            <span>{bucket.totalPlates}</span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-400">{t("vendor.orders.noDataForFilter")}</p>
      )}
    </div>
  );
}
