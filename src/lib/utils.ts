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

export const LEVELS = [
  { value: "PRESCHOOL", label: "Preescolar" },
  { value: "ELEMENTARY", label: "Primaria" },
  { value: "MIDDLE_HIGH", label: "Secundaria" },
  { value: "ADULT", label: "Adulto" },
] as const;

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
