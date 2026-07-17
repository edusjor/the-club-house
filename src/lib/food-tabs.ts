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

export const DIETARY_TAGS = ["GLUTEN_FREE", "LACTOSE_FREE", "VEGETARIAN"] as const;
export type DietaryTag = (typeof DIETARY_TAGS)[number];

const DIETARY_TAG_ALIASES: Record<string, DietaryTag> = {
  GLUTEN_FREE: "GLUTEN_FREE",
  GLUTENFREE: "GLUTEN_FREE",
  SIN_GLUTEN: "GLUTEN_FREE",
  LACTOSE_FREE: "LACTOSE_FREE",
  LACTOSEFREE: "LACTOSE_FREE",
  SIN_LACTOSA: "LACTOSE_FREE",
  DAIRY_FREE: "LACTOSE_FREE",
  VEGETARIAN: "VEGETARIAN",
  VEGETARIANO: "VEGETARIAN",
  VEGETARIANA: "VEGETARIAN",
  VEGGIE: "VEGETARIAN",
};

export function normalizeDietaryTag(tag: string): DietaryTag | null {
  const normalized = normalizeFoodToken(tag)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return DIETARY_TAG_ALIASES[normalized] ?? null;
}

export function getDietaryTags(rawTags: string | null | undefined): DietaryTag[] {
  const found = new Set<DietaryTag>();
  for (const tag of parseFoodTags(rawTags)) {
    const canonical = normalizeDietaryTag(tag);
    if (canonical) found.add(canonical);
  }
  return DIETARY_TAGS.filter((tag) => found.has(tag));
}
