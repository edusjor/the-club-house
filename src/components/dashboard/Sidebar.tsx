"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Link from "@/i18n/Link";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale, useTranslations } from "@/i18n/I18nProvider";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  GraduationCap,
  UtensilsCrossed,
  Tag,
  ShoppingCart,
  CreditCard,
  LogOut,
  ChefHat,
  Calendar,
  History,
  Search,
  Baby,
  DollarSign,
} from "lucide-react";

type NavItem = {
  href: string;
  labelKey: string;
  icon: React.ElementType;
};

const adminNav: NavItem[] = [
  { href: "/admin/dashboard", labelKey: "nav.admin.dashboard", icon: LayoutDashboard },
  { href: "/admin/users", labelKey: "nav.admin.users", icon: Users },
  { href: "/admin/parents", labelKey: "nav.admin.parents", icon: UserCircle },
  { href: "/admin/students", labelKey: "nav.admin.students", icon: GraduationCap },
  { href: "/admin/menu", labelKey: "nav.admin.menu", icon: UtensilsCrossed },
  { href: "/admin/categories", labelKey: "nav.admin.categories", icon: Tag },
  { href: "/admin/orders", labelKey: "nav.admin.orders", icon: ShoppingCart },
  { href: "/admin/payments", labelKey: "nav.admin.payments", icon: CreditCard },
];

const parentNav: NavItem[] = [
  { href: "/parent/dashboard", labelKey: "nav.parent.dashboard", icon: LayoutDashboard },
  { href: "/parent/children", labelKey: "nav.parent.myChildren", icon: Baby },
  { href: "/parent/menu", labelKey: "nav.parent.menu", icon: UtensilsCrossed },
  { href: "/parent/plan", labelKey: "nav.parent.plan", icon: Calendar },
  { href: "/parent/history", labelKey: "nav.parent.history", icon: History },
  { href: "/parent/balance", labelKey: "nav.parent.balance", icon: DollarSign },
];

const vendorNav: NavItem[] = [
  { href: "/vendor/dashboard", labelKey: "nav.vendor.dashboard", icon: LayoutDashboard },
  { href: "/vendor/new-order", labelKey: "nav.vendor.newOrder", icon: UtensilsCrossed },
  { href: "/vendor/orders", labelKey: "nav.vendor.ordersOfDay", icon: ShoppingCart },
  { href: "/vendor/search", labelKey: "nav.vendor.searchStudent", icon: Search },
];

type SidebarRole = "ADMIN" | "PARENT" | "VENDOR";

const navByRole: Record<SidebarRole, NavItem[]> = {
  ADMIN: adminNav,
  PARENT: parentNav,
  VENDOR: vendorNav,
};

const titleKeyByRole: Record<SidebarRole, string> = {
  ADMIN: "nav.admin.title",
  PARENT: "nav.parent.title",
  VENDOR: "nav.vendor.title",
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
  const locale = useLocale();
  const t = useTranslations();
  const navItems = navByRole[role];
  const title = t(titleKeyByRole[role]);

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
          const fullHref = `/${locale}${item.href}`;
          const active = pathname === fullHref || pathname.startsWith(fullHref + "/");
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
              <span className="text-inherit text-outline-subtle">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="border-t border-slate-700 p-4 space-y-3">
        <div className="px-3">
          <LanguageSwitcher />
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {userName?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate text-outline-subtle">
              {userName ?? "User"}
            </p>
            <p className="text-slate-500 text-xs truncate">
              {userEmail ?? ""}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            onNavigate?.();
            signOut({ callbackUrl: `/${locale}/login` });
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold tracking-[0.01em] text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-inherit text-outline-subtle">{t("nav.logout")}</span>
        </button>
      </div>
    </aside>
  );
}
