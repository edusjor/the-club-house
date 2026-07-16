import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatNumericReference(id: string, digits = 8): string {
  const normalized = String(id ?? "").trim().toLowerCase();
  if (!normalized) return "0".repeat(Math.max(1, digits));

  let accumulator = 0n;
  const modulus = 10n ** 12n;

  for (const char of normalized) {
    const base36 = Number.parseInt(char, 36);
    const value = Number.isFinite(base36) ? base36 + 1 : char.charCodeAt(0);
    accumulator = (accumulator * 41n + BigInt(value)) % modulus;
  }

  const raw = accumulator.toString();
  return raw.padStart(Math.max(1, digits), "0").slice(-Math.max(1, digits));
}

export function formatOrderNumber(orderId: string): string {
  return formatNumericReference(orderId, 8);
}

export function formatPaymentNumber(paymentId: string): string {
  return formatNumericReference(paymentId, 8);
}

export const LEVELS = [
  { value: "ELEMENTARY", label: "Elementary" },
  { value: "MIDDLE_HIGH", label: "Middle/High School" },
  { value: "ATHLETES", label: "Athletes" },
] as const;

export const PRICE_LEVELS = [
  { value: "ELEMENTARY", label: "Elementary" },
  { value: "MIDDLE_HIGH", label: "Middle/High School" },
  { value: "STAFF", label: "Staff" },
  { value: "ATHLETES", label: "Athletes" },
] as const;

const PRICE_LEVEL_ALIASES: Record<string, string> = {
  PRESCHOOL: "ELEMENTARY",
  PRIMARIA: "ELEMENTARY",
  PRIMARY: "ELEMENTARY",
  ELEMENTARY: "ELEMENTARY",
  MIDDLE: "MIDDLE_HIGH",
  MIDDLE_HIGH: "MIDDLE_HIGH",
  SECONDARY: "MIDDLE_HIGH",
  SECUNDARIA: "MIDDLE_HIGH",
  ADULT: "STAFF",
  STAFF: "STAFF",
  PERSONAL: "STAFF",
  ATHLETE: "ATHLETES",
  ATHLETES: "ATHLETES",
  DEPORTISTAS: "ATHLETES",
};

export function normalizePriceLevel(level: string): string {
  const normalized = String(level ?? "").trim().toUpperCase();
  if (!normalized) return "";
  return PRICE_LEVEL_ALIASES[normalized] ?? normalized;
}

export const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "PARENT", label: "Padre / Madre" },
  { value: "VENDOR", label: "Vendedor" },
  { value: "STUDENT", label: "Estudiante" },
] as const;

export const ORDER_STATUSES = [
  { value: "PENDING", label: "Pendiente", color: "yellow" },
  { value: "PAID", label: "Pagado", color: "blue" },
  { value: "PREPARING", label: "En preparación", color: "orange" },
  { value: "DELIVERED", label: "Entregado", color: "green" },
  { value: "NOT_PICKED_UP", label: "No recogido", color: "gray" },
  { value: "CANCELLED", label: "Cancelado", color: "red" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "PENDING", label: "Pendiente revisión", color: "yellow" },
  { value: "APPROVED", label: "Aprobado", color: "green" },
  { value: "REJECTED", label: "Rechazado", color: "red" },
] as const;

export const PACKAGE_STATUSES = [
  { value: "ACTIVE", label: "Activo", color: "green" },
  { value: "EXPIRED", label: "Vencido", color: "gray" },
  { value: "EXHAUSTED", label: "Agotado", color: "red" },
  { value: "PAUSED", label: "Pausado", color: "yellow" },
] as const;

export const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
