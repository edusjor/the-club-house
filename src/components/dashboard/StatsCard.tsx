import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-cyan-600",
  iconBg = "bg-cyan-100",
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium mt-1",
                trend.value >= 0 ? "text-emerald-600" : "text-red-500"
              )}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
              {trend.label}
            </p>
          )}
        </div>
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}

