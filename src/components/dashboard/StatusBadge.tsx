import { cn } from "@/lib/utils";

interface BadgeProps {
  status: string;
  className?: string;
}

const statusMap: Record<
  string,
  { label: string; className: string }
> = {
  // Order statuses
  PENDING: { label: "Pendiente", className: "bg-yellow-100 text-yellow-700" },
  PAID: { label: "Pagado", className: "bg-blue-100 text-blue-700" },
  PREPARING: { label: "En preparación", className: "bg-orange-100 text-orange-700" },
  DELIVERED: { label: "Entregado", className: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Cancelado", className: "bg-red-100 text-red-700" },
  // Payment statuses
  APPROVED: { label: "Aprobado", className: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rechazado", className: "bg-red-100 text-red-700" },
  // Package statuses
  ACTIVE: { label: "Activo", className: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { label: "Vencido", className: "bg-slate-100 text-slate-600" },
  EXHAUSTED: { label: "Agotado", className: "bg-red-100 text-red-700" },
  PAUSED: { label: "Pausado", className: "bg-yellow-100 text-yellow-700" },
  INACTIVE: { label: "Inactivo", className: "bg-slate-100 text-slate-600" },
  // Roles
  ADMIN: { label: "Admin", className: "bg-purple-100 text-purple-700" },
  PARENT: { label: "Padre/Madre", className: "bg-cyan-100 text-cyan-700" },
  VENDOR: { label: "Vendedor", className: "bg-orange-100 text-orange-700" },
  STUDENT: { label: "Estudiante", className: "bg-indigo-100 text-indigo-700" },
  // Levels
  PRESCHOOL: { label: "Preescolar", className: "bg-pink-100 text-pink-700" },
  ELEMENTARY: { label: "Primaria", className: "bg-cyan-100 text-cyan-700" },
  MIDDLE_HIGH: { label: "Secundaria", className: "bg-violet-100 text-violet-700" },
  ADULT: { label: "Adulto", className: "bg-slate-100 text-slate-700" },
};

export default function StatusBadge({ status, className }: BadgeProps) {
  const config = statusMap[status] ?? {
    label: status,
    className: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

