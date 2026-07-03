"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/dashboard/Sidebar";

type ShellRole = "ADMIN" | "PARENT" | "VENDOR";

interface DashboardShellProps {
  role: ShellRole;
  userName?: string;
  userEmail?: string;
  children: React.ReactNode;
}

export default function DashboardShell({
  role,
  userName,
  userEmail,
  children,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        className="hidden xl:flex"
      />

      {mobileOpen ? (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 xl:hidden"
          aria-label="Cerrar menú"
        />
      ) : null}

      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        onNavigate={() => setMobileOpen(false)}
        className={`xl:hidden transition-transform duration-300 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      />

      <button
        onClick={() => setMobileOpen((current) => !current)}
        className="fixed left-3 top-3 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50 xl:hidden"
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <div className="ml-0 flex flex-1 flex-col overflow-hidden xl:ml-64">
        <main className="flex-1 overflow-y-auto pt-14 xl:pt-0">{children}</main>
      </div>
    </div>
  );
}
