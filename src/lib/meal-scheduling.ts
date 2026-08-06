export type MealPeriod = "BREAK" | "LUNCH" | "AFTERSCHOOL";
export type TargetDay = "TODAY" | "TOMORROW";

export const MEAL_PERIOD_VALUES: MealPeriod[] = ["BREAK", "LUNCH", "AFTERSCHOOL"];
export const TARGET_DAY_VALUES: TargetDay[] = ["TODAY", "TOMORROW"];

export function isMealPeriod(value: unknown): value is MealPeriod {
  return typeof value === "string" && (MEAL_PERIOD_VALUES as string[]).includes(value);
}

export function isTargetDay(value: unknown): value is TargetDay {
  return typeof value === "string" && (TARGET_DAY_VALUES as string[]).includes(value);
}

// Costa Rica is a fixed UTC-6 offset year-round (no DST).
const CR_OFFSET_MS = 6 * 60 * 60 * 1000;

// Internal-only anchor time per meal period. NOT a real deadline or serving
// time, and never shown to parents — it exists only so that (a) different
// moments for the same student/day land on distinct scheduledDate timestamps
// and therefore group into separate Orders exactly like the existing
// exact-datetime grouping already does (src/app/api/orders/route.ts), and
// (b) anything sorting by scheduledDate (e.g. the vendor kitchen view) still
// shows moments in a sane order (Break before Lunch before Afterschool).
const MEAL_PERIOD_ANCHOR_TIME: Record<MealPeriod, { hour: number; minute: number }> = {
  BREAK: { hour: 7, minute: 0 },
  LUNCH: { hour: 12, minute: 0 },
  AFTERSCHOOL: { hour: 14, minute: 30 },
};

function getCostaRicaDateParts(reference: Date) {
  const shifted = new Date(reference.getTime() - CR_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

type DateParts = { year: number; month: number; day: number };

// The school doesn't operate Saturday/Sunday, so nothing — an order, a
// package start date — can ever land on a weekend. Given a calendar day,
// rolls forward to the next Monday if it falls on one.
function rollToNextSchoolDay(parts: DateParts): DateParts {
  // Noon UTC is a neutral anchor: it's only used to read back the day of
  // the week, which doesn't depend on time zone.
  let cursor = Date.UTC(parts.year, parts.month, parts.day, 12);
  while (true) {
    const dayOfWeek = new Date(cursor).getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) break;
    cursor += 24 * 60 * 60 * 1000;
  }
  const rolled = new Date(cursor);
  return { year: rolled.getUTCFullYear(), month: rolled.getUTCMonth(), day: rolled.getUTCDate() };
}

// The parent no longer picks "today" vs "tomorrow" by hand — it's resolved
// automatically from the current Costa Rica clock time. Before 4:00pm the
// order is for today; at/after 4:00pm today's ordering window is considered
// closed and it's automatically for tomorrow (the vendor will see it the
// next day and prep/deliver it then). Right after midnight this naturally
// flips back to "today" for the new calendar day.
export const TODAY_CUTOFF_HOUR = 16;

export function resolveTargetDay(reference: Date = new Date()): TargetDay {
  const { hour } = getCostaRicaDateParts(reference);
  return hour >= TODAY_CUTOFF_HOUR ? "TOMORROW" : "TODAY";
}

export function buildScheduledDate(
  targetDay: TargetDay,
  mealPeriod: MealPeriod,
  reference: Date = new Date()
): Date {
  const { year, month, day } = getCostaRicaDateParts(reference);
  const dayOffset = targetDay === "TOMORROW" ? 1 : 0;
  const rolled = rollToNextSchoolDay({ year, month, day: day + dayOffset });
  const { hour, minute } = MEAL_PERIOD_ANCHOR_TIME[mealPeriod];

  return new Date(Date.UTC(rolled.year, rolled.month, rolled.day, hour, minute) + CR_OFFSET_MS);
}

export function buildScheduledDateForMealPeriod(mealPeriod: MealPeriod, reference: Date = new Date()): Date {
  return buildScheduledDate(resolveTargetDay(reference), mealPeriod, reference);
}

// The earliest calendar day (Costa Rica time) a new commitment — an order, a
// package start date — can be scheduled for: today before the 4pm ordering
// cutoff, otherwise the next day, always rolled forward off weekends since
// the school doesn't operate then (so a Friday order placed after 4pm, or
// any order placed on a Saturday/Sunday, lands on Monday, never Sat/Sun).
export function resolveEarliestSchoolDateParts(reference: Date = new Date()): DateParts {
  const { year, month, day } = getCostaRicaDateParts(reference);
  const dayOffset = resolveTargetDay(reference) === "TOMORROW" ? 1 : 0;
  return rollToNextSchoolDay({ year, month, day: day + dayOffset });
}

export function resolveEarliestSchoolDate(reference: Date = new Date()): Date {
  const { year, month, day } = resolveEarliestSchoolDateParts(reference);
  return new Date(Date.UTC(year, month, day, 0, 0) + CR_OFFSET_MS);
}

export function resolveEarliestSchoolDateString(reference: Date = new Date()): string {
  const { year, month, day } = resolveEarliestSchoolDateParts(reference);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isEarliestSchoolDateToday(reference: Date = new Date()): boolean {
  const today = getCostaRicaDateParts(reference);
  const earliest = resolveEarliestSchoolDateParts(reference);
  return today.year === earliest.year && today.month === earliest.month && today.day === earliest.day;
}

// True when `date`'s calendar day (read in UTC — the right read for both a
// date-only "YYYY-MM-DD" string, which parses to UTC midnight, and for a
// Date built via resolveEarliestSchoolDate/Date.UTC) falls before the
// earliest day new commitments can start on.
export function isBeforeEarliestSchoolDate(date: Date, reference: Date = new Date()): boolean {
  const earliest = resolveEarliestSchoolDateParts(reference);
  const earliestKey = Date.UTC(earliest.year, earliest.month, earliest.day);
  const requestedKey = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return requestedKey < earliestKey;
}

// True when `date` itself (read in UTC, same reasoning as above) falls on a
// Saturday or Sunday — independent of isBeforeEarliestSchoolDate, since a
// weekend date can be freely picked from an open-ended date input (a package
// start date) without ever being "before" the floor, e.g. picking a Saturday
// two weeks out.
export function isWeekendDate(date: Date): boolean {
  const dayOfWeek = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12)
  ).getUTCDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

// Rolls an arbitrary calendar day forward to the next Monday if it falls on
// a weekend — used for package renewal defaults (day after expiration),
// unlike resolveEarliestSchoolDate* which is always anchored to "now".
export function rollDateForwardOffWeekend(date: Date): Date {
  const { year, month, day } = rollToNextSchoolDay({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  });
  return new Date(Date.UTC(year, month, day, 0, 0) + CR_OFFSET_MS);
}

export function toDateInputString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}
