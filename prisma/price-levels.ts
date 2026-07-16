export type MenuPriceRow = {
  level: string;
  price: number;
};

export type FixedPriceLevel = "ELEMENTARY" | "MIDDLE_HIGH" | "STAFF" | "ATHLETES";

export type FixedMenuPriceRow = {
  level: FixedPriceLevel;
  price: number;
};

const PRICE_LEVEL_ALIASES: Record<string, FixedPriceLevel | "ADULT"> = {
  PRESCHOOL: "ELEMENTARY",
  PRIMARIA: "ELEMENTARY",
  PRIMARY: "ELEMENTARY",
  ELEMENTARY: "ELEMENTARY",
  MIDDLE: "MIDDLE_HIGH",
  MIDDLE_HIGH: "MIDDLE_HIGH",
  SECONDARY: "MIDDLE_HIGH",
  SECUNDARIA: "MIDDLE_HIGH",
  ADULT: "ADULT",
  STAFF: "STAFF",
  PERSONAL: "STAFF",
  ATHLETE: "ATHLETES",
  ATHLETES: "ATHLETES",
  DEPORTISTAS: "ATHLETES",
};

function toSafePrice(value: number): number | null {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

function withIncrement(base: number, increment = 300): number {
  return Math.max(1, Math.round(base + increment));
}

export function normalizeMenuPriceLevel(level: string): string {
  const normalized = String(level ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return PRICE_LEVEL_ALIASES[normalized] ?? normalized;
}

export function buildFixedMenuPrices(prices: MenuPriceRow[]): FixedMenuPriceRow[] {
  const pricesByLevel = new Map<string, number>();
  const knownPrices: number[] = [];

  for (const row of prices) {
    const normalizedLevel = normalizeMenuPriceLevel(row.level);
    const safePrice = toSafePrice(row.price);
    if (!safePrice) continue;

    knownPrices.push(safePrice);

    const existing = pricesByLevel.get(normalizedLevel);
    if (existing === undefined || safePrice > existing) {
      pricesByLevel.set(normalizedLevel, safePrice);
    }
  }

  const baseline = knownPrices.length > 0 ? Math.min(...knownPrices) : 1000;

  const elementary = pricesByLevel.get("ELEMENTARY") ?? baseline;
  const middleHigh = Math.max(
    pricesByLevel.get("MIDDLE_HIGH") ?? withIncrement(elementary),
    elementary
  );
  const staff = Math.max(
    pricesByLevel.get("STAFF") ?? pricesByLevel.get("ADULT") ?? withIncrement(middleHigh),
    middleHigh
  );
  const athletes = Math.max(
    pricesByLevel.get("ATHLETES") ?? withIncrement(staff),
    staff
  );

  return [
    { level: "ELEMENTARY", price: elementary },
    { level: "MIDDLE_HIGH", price: middleHigh },
    { level: "STAFF", price: staff },
    { level: "ATHLETES", price: athletes },
  ];
}
