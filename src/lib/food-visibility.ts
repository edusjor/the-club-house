export type FoodVisibility = "ALL" | "VENDOR_ONLY";

export const FOOD_VISIBILITY_VALUES: FoodVisibility[] = ["ALL", "VENDOR_ONLY"];

export function isFoodVisibility(value: unknown): value is FoodVisibility {
  return typeof value === "string" && (FOOD_VISIBILITY_VALUES as string[]).includes(value);
}

export function getFoodVisibility(item: { visibility?: string | null }): FoodVisibility {
  return isFoodVisibility(item.visibility) ? item.visibility : "ALL";
}

export function canRoleSeeVendorOnlyItems(role: string | undefined | null): boolean {
  return role === "ADMIN" || role === "VENDOR";
}
