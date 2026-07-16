export type FoodTab = "GENERAL" | "DRINKS" | "CASADOS";

export const FOOD_TABS: { key: FoodTab; labelKey: string }[] = [
  { key: "GENERAL", labelKey: "foodTabs.general" },
  { key: "DRINKS", labelKey: "foodTabs.drinks" },
  { key: "CASADOS", labelKey: "foodTabs.casados" },
];

export function normalizeFoodToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function getFoodTab(item: { name: string; category: { name: string } }): FoodTab {
  const normalizedName = normalizeFoodToken(item.name);
  const normalizedCategory = normalizeFoodToken(item.category.name);

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

export function parseFoodTags(rawTags: string | null | undefined): string[] {
  if (!rawTags) return [];
  try {
    const parsed: unknown = JSON.parse(rawTags);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}
