"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/I18nProvider";

interface BadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<
  string,
  { labelKey?: string; label?: string; className: string }
> = {
  // Order statuses
  PENDING: { labelKey: "status.pending", className: "bg-yellow-100 text-yellow-700" },
  PAID: { labelKey: "status.paid", className: "bg-blue-100 text-blue-700" },
  PREPARING: { labelKey: "status.preparing", className: "bg-orange-100 text-orange-700" },
  DELIVERED: { labelKey: "status.delivered", className: "bg-emerald-100 text-emerald-700" },
  NOT_PICKED_UP: { labelKey: "status.notPickedUp", className: "bg-slate-200 text-slate-700" },
  CANCELLED: { labelKey: "status.cancelled", className: "bg-red-100 text-red-700" },
  // Payment statuses
  APPROVED: { labelKey: "status.approved", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { labelKey: "status.rejected", className: "bg-red-100 text-red-700" },
  // Package statuses
  ACTIVE: { labelKey: "status.active", className: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { labelKey: "status.expired", className: "bg-slate-100 text-slate-600" },
  EXHAUSTED: { labelKey: "status.exhausted", className: "bg-red-100 text-red-700" },
  PAUSED: { labelKey: "status.paused", className: "bg-yellow-100 text-yellow-700" },
  INACTIVE: { labelKey: "status.inactive", className: "bg-slate-100 text-slate-600" },
  // Roles
  ADMIN: { labelKey: "status.admin", className: "bg-purple-100 text-purple-700" },
  PARENT: { labelKey: "status.parent", className: "bg-cyan-100 text-cyan-700" },
  VENDOR: { labelKey: "status.vendor", className: "bg-orange-100 text-orange-700" },
  STUDENT: { labelKey: "status.student", className: "bg-indigo-100 text-indigo-700" },
  // Levels (school-specific terms, kept in English for both locales)
  PRESCHOOL: { label: "Preschool", className: "bg-pink-100 text-pink-700" },
  ELEMENTARY: { label: "Elementary", className: "bg-cyan-100 text-cyan-700" },
  MIDDLE_HIGH: { label: "Middle/High School", className: "bg-violet-100 text-violet-700" },
  STAFF: { label: "Staff", className: "bg-slate-100 text-slate-700" },
  ATHLETES: { label: "Athletes", className: "bg-emerald-100 text-emerald-700" },
  ADULT: { label: "Adult", className: "bg-slate-100 text-slate-700" },
};

export default function StatusBadge({ status, className }: BadgeProps) {
  const t = useTranslations();
  const config = statusMap[status];
  const label = config ? (config.labelKey ? t(config.labelKey) : config.label ?? status) : status;
  const badgeClassName = config?.className ?? "bg-slate-100 text-slate-600";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        badgeClassName,
        className
      )}
    >
      {label}
    </span>
  );
}
