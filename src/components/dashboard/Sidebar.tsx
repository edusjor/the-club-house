"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  GraduationCap,
  UtensilsCrossed,
  Tag,
  Package,
  ShoppingCart,
  ClipboardList,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  ChefHat,
  Calendar,
  History,
  FileText,
  Search,
  ShoppingBag,
  BookOpen,
  Baby,
  DollarSign,
  Bell,
  Receipt,
  Home,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/parents", label: "Padres", icon: UserCircle },
  { href: "/admin/students", label: "Estudiantes", icon: GraduationCap },
  { href: "/admin/menu", label: "Menú de Comidas", icon: UtensilsCrossed },
  { href: "/admin/categories", label: "Categorías", icon: Tag },
  { href: "/admin/packages", label: "Paquetes", icon: Package },
  { href: "/admin/orders", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/consumptions", label: "Consumos", icon: ClipboardList },
  { href: "/admin/payments", label: "Pagos Pendientes", icon: CreditCard },
  { href: "/admin/reports", label: "Reportes", icon: BarChart3 },
  { href: "/admin/settings", label: "Configuración", icon: Settings },
];

const parentNav: NavItem[] = [
  { href: "/parent/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/parent/children", label: "Mis Hijos", icon: Baby },
  { href: "/parent/menu", label: "Menú", icon: UtensilsCrossed },
  { href: "/parent/plan", label: "Planificar Comidas", icon: Calendar },
  { href: "/parent/packages", label: "Paquetes", icon: Package },
  { href: "/parent/history", label: "Historial de Consumo", icon: History },
  { href: "/parent/payments", label: "Pagos", icon: DollarSign },
  { href: "/parent/receipts", label: "Comprobantes", icon: Receipt },
  { href: "/parent/statements", label: "Estados de Cuenta", icon: FileText },
];

const vendorNav: NavItem[] = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/orders", label: "Pedidos del Día", icon: ShoppingCart },
  { href: "/vendor/register", label: "Registrar Consumo", icon: ClipboardList },
  { href: "/vendor/search", label: "Buscar Estudiante", icon: Search },
  { href: "/vendor/menu", label: "Menú Disponible", icon: BookOpen },
  { href: "/vendor/sales", label: "Ventas del Día", icon: ShoppingBag },
  { href: "/vendor/history", label: "Historial", icon: History },
];

type SidebarRole = "ADMIN" | "PARENT" | "VENDOR";

const navByRole: Record<SidebarRole, NavItem[]> = {
  ADMIN: adminNav,
  PARENT: parentNav,
  VENDOR: vendorNav,
};

const titleByRole: Record<SidebarRole, string> = {
  ADMIN: "Panel Admin",
  PARENT: "Portal de Padres",
  VENDOR: "Panel Vendedor",
};

interface SidebarProps {
  role: SidebarRole;
  userName?: string;
  userEmail?: string;
  className?: string;
  onNavigate?: () => void;
}

export default function Sidebar({ role, userName, userEmail, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const navItems = navByRole[role];
  const title = titleByRole[role];

  return (
    <aside className={cn("fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col shadow-2xl", className)}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">
            The Club House
          </p>
          <p className="text-cyan-400 text-xs">{title}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold tracking-[0.01em] transition-all duration-150",
                active
                  ? "bg-cyan-500 text-white shadow-md"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-inherit text-outline-subtle">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-slate-700 p-4 space-y-3">
        <Link
          href={`/${role.toLowerCase()}/notifications`}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold tracking-[0.01em] text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <Bell className="w-4 h-4" />
          <span className="text-inherit text-outline-subtle">Notificaciones</span>
        </Link>
        <Link
          href={`/${role.toLowerCase()}/profile`}
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold tracking-[0.01em] text-slate-400 hover:bg-slate-800 hover:text-white transition-all"
        >
          <Home className="w-4 h-4" />
          <span className="text-inherit text-outline-subtle">Mi Perfil</span>
        </Link>

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {userName?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate text-outline-subtle">
              {userName ?? "Usuario"}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {userEmail ?? ""}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onNavigate?.();
            signOut({ callbackUrl: "/login" });
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold tracking-[0.01em] text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-inherit text-outline-subtle">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

