"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, List, X } from "lucide-react";
import { formatCurrency, formatOrderNumber } from "@/lib/utils";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";
import { intlLocale } from "@/i18n/config";

type MealCalendarItem = {
  id: string;
  studentId: string;
  studentName: string;
  scheduledDate: string;
  foodItemName: string;
  price: number;
  quantity: number;
  orderId: string;
  orderStatus: string;
};

type Student = {
  id: string;
  name: string;
};

interface MealCalendarProps {
  students: Student[];
  items: MealCalendarItem[];
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildMonthCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  const leadingBlanks = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export default function MealCalendar({ students, items }: MealCalendarProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [studentFilter, setStudentFilter] = useState("ALL");
  const [monthOffset, setMonthOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const ianaLocale = intlLocale[locale];

  const weekHeaderDays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(ianaLocale, { weekday: "short" });
    // Reference week starting Monday (2024-01-01 is a Monday) so headers read Mon..Sun.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)));
  }, [ianaLocale]);

  const monthLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(ianaLocale, { month: "long" });
    return (date: Date) => formatter.format(date);
  }, [ianaLocale]);

  const weekdayLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(ianaLocale, { weekday: "long" });
    return (date: Date) => formatter.format(date);
  }, [ianaLocale]);

  const formatTime = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(ianaLocale, { hour: "2-digit", minute: "2-digit" });
    return (date: Date) => formatter.format(date);
  }, [ianaLocale]);

  const today = useMemo(() => new Date(), []);
  const { displayedDate, year, month } = useMemo(() => {
    const displayed = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return { displayedDate: displayed, year: displayed.getFullYear(), month: displayed.getMonth() };
  }, [today, monthOffset]);

  const filteredItems = useMemo(
    () => (studentFilter === "ALL" ? items : items.filter((item) => item.studentId === studentFilter)),
    [items, studentFilter]
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, MealCalendarItem[]>();
    for (const item of filteredItems) {
      const key = dayKey(new Date(item.scheduledDate));
      const existing = map.get(key);
      if (existing) {
        existing.push(item);
      } else {
        map.set(key, [item]);
      }
    }
    return map;
  }, [filteredItems]);

  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);

  const daysWithItemsInMonth = useMemo(
    () =>
      cells
        .filter((date): date is Date => Boolean(date))
        .map((date) => ({ date, key: dayKey(date), dayItems: itemsByDay.get(dayKey(date)) ?? [] }))
        .filter((entry) => entry.dayItems.length > 0),
    [cells, itemsByDay]
  );

  const todayKey = dayKey(today);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedDayItems = selectedDayKey ? itemsByDay.get(selectedDayKey) ?? [] : [];
  const selectedDate = selectedDayKey
    ? cells.find((date) => date && dayKey(date) === selectedDayKey) ?? null
    : null;

  const handleDayClick = (key: string) => {
    setSelectedDayKey((current) => (current === key ? null : key));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-900">{t("mealCalendar.title")}</h2>
          <p className="text-xs text-slate-500">{t("mealCalendar.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={studentFilter}
            onChange={(event) => {
              setStudentFilter(event.target.value);
              setSelectedDayKey(null);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700"
          >
            <option value="ALL">{t("mealCalendar.allChildren")}</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>

          {viewMode === "calendar" ? (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1">
              <button
                type="button"
                onClick={() => setMonthOffset((current) => Math.max(-1, current - 1))}
                disabled={monthOffset <= -1}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label={t("mealCalendar.prevMonth")}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-24 text-center text-xs font-semibold text-slate-700 capitalize">
                {monthLabel(displayedDate)} {year}
              </span>
              <button
                type="button"
                onClick={() => setMonthOffset((current) => Math.min(1, current + 1))}
                disabled={monthOffset >= 1}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label={t("mealCalendar.nextMonth")}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                viewMode === "calendar" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t("mealCalendar.calendarView")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                viewMode === "list" ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              {t("mealCalendar.listView")}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {viewMode === "calendar" ? (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 capitalize">
              {weekHeaderDays.map((label, index) => (
                <div key={`${label}-${index}`}>{label}</div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((date, index) => {
                if (!date) {
                  return <div key={`blank-${index}`} className="h-9 sm:h-11" />;
                }

                const key = dayKey(date);
                const dayItems = itemsByDay.get(key) ?? [];
                const isToday = key === todayKey;
                const isWeekday = date.getDay() >= 1 && date.getDay() <= 5;
                const isPast = date.getTime() < todayStart.getTime();
                const isMissing = isWeekday && !isPast && dayItems.length === 0;
                const isSelected = key === selectedDayKey;

                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => handleDayClick(key)}
                    className={`flex h-9 flex-col items-center justify-center rounded-lg border text-[11px] leading-none transition-colors sm:h-11 ${
                      dayItems.length > 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        : isMissing
                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "border-slate-100 bg-slate-50 text-slate-400 hover:bg-slate-100"
                    } ${isToday ? "ring-2 ring-cyan-400" : ""} ${isSelected ? "ring-2 ring-cyan-600" : ""}`}
                  >
                    <span className="font-semibold">{date.getDate()}</span>
                    {dayItems.length > 0 ? (
                      <span className="text-[9px] font-bold">{dayItems.length}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {daysWithItemsInMonth.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                {t("mealCalendar.noMealsForMonth").replace("{month}", monthLabel(displayedDate))}
              </p>
            ) : (
              daysWithItemsInMonth.map(({ date, key, dayItems }) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => handleDayClick(key)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                    key === selectedDayKey
                      ? "border-cyan-300 bg-cyan-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-800 capitalize">
                    {weekdayLabel(date)} {date.getDate()} {monthLabel(date)}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {dayItems.length} {t("mealCalendar.meals")}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {selectedDayKey && selectedDate ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900 capitalize">
                {weekdayLabel(selectedDate)} {selectedDate.getDate()} {monthLabel(selectedDate)}
              </p>
              <button
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label={t("mealCalendar.closeDetail")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedDayItems.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">{t("mealCalendar.noOrdersForDay")}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {selectedDayItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{item.foodItemName}</p>
                      <p className="text-xs text-slate-500">
                        {formatTime(new Date(item.scheduledDate))} · {item.studentName} · {t("mealCalendar.order")} #{formatOrderNumber(item.orderId)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-slate-700">
                      {formatCurrency(item.price * (item.quantity > 0 ? item.quantity : 1))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
