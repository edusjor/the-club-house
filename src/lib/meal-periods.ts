import type { MealPeriod } from "./meal-scheduling";

export const MEAL_PERIODS: { key: MealPeriod; labelKey: string }[] = [
  { key: "BREAK", labelKey: "mealPeriods.break" },
  { key: "LUNCH", labelKey: "mealPeriods.lunch" },
  { key: "AFTERSCHOOL", labelKey: "mealPeriods.afterschool" },
];
