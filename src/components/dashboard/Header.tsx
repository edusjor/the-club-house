"use client";

import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center gap-3 pr-4 pl-16 shadow-sm sm:gap-4 sm:px-6">
      <div className="flex-1">
        <h1 className="text-lg font-bold text-slate-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-slate-500 leading-tight">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 hover:bg-cyan-100 text-slate-600 hover:text-cyan-600 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}

