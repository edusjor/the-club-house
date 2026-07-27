export type MealPeriod = "BREAK" | "LUNCH" | "AFTERSCHOOL" | "MEAL_OF_THE_DAY";
export type TargetDay = "TODAY" | "TOMORROW";

export const MEAL_PERIOD_VALUES: MealPeriod[] = ["BREAK", "LUNCH", "AFTERSCHOOL", "MEAL_OF_THE_DAY"];
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
  MEAL_OF_THE_DAY: { hour: 11, minute: 0 },
  LUNCH: { hour: 12, minute: 0 },
  AFTERSCHOOL: { hour: 14, minute: 30 },
};

function getCostaRicaDateParts(reference: Date) {
  const shifted = new Date(reference.getTime() - CR_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

export function buildScheduledDate(
  targetDay: TargetDay,
  mealPeriod: MealPeriod,
  reference: Date = new Date()
): Date {
  const { year, month, day } = getCostaRicaDateParts(reference);
  const { hour, minute } = MEAL_PERIOD_ANCHOR_TIME[mealPeriod];
  const dayOffset = targetDay === "TOMORROW" ? 1 : 0;

  return new Date(Date.UTC(year, month, day + dayOffset, hour, minute) + CR_OFFSET_MS);
}
