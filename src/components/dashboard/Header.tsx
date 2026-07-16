"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    const scrollContainer = document.getElementById("dashboard-scroll-area");
    if (!scrollContainer) return;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const delta = scrollTop - lastScrollTop.current;

      if (scrollTop < 24) {
        setHidden(false);
      } else if (delta > 4) {
        setHidden(true);
      } else if (delta < -4) {
        setHidden(false);
      }

      lastScrollTop.current = scrollTop;
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center gap-3 pr-4 pl-16 shadow-sm transition-transform duration-300 sm:gap-4 sm:px-6 ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex-1">
        <h1 className="text-lg font-bold text-slate-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="hidden text-xs text-slate-500 leading-tight sm:block">{subtitle}</p>
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

