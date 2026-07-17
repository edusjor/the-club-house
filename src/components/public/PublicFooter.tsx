"use client";

import Link from "@/i18n/Link";
import { ChefHat, Mail, Phone, MapPin, Globe, AtSign, MessageCircle } from "lucide-react";
import { useTranslations } from "@/i18n/I18nProvider";

export default function PublicFooter() {
  const t = useTranslations();

  const menuItems: string[] = [
    t("publicFooter.menuItems.0"),
    t("publicFooter.menuItems.1"),
    t("publicFooter.menuItems.2"),
    t("publicFooter.menuItems.3"),
    t("publicFooter.menuItems.4"),
    t("publicFooter.menuItems.5"),
  ];

  const portalLinks = [
    { href: "/login", label: t("publicFooter.portalSignIn") },
    { href: "/parent/dashboard", label: t("publicFooter.portalParent") },
    { href: "/admin/dashboard", label: t("publicFooter.portalAdmin") },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm uppercase tracking-wide">
                The Club House
              </p>
              <p className="text-cyan-400 text-[10px] uppercase tracking-widest">
                {t("auth.layout.tagline")}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t("publicFooter.description")}
          </p>
          <div className="flex gap-3 mt-4">
            {[Globe, AtSign, MessageCircle].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center hover:bg-cyan-500 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">
            {t("publicFooter.menuTitle")}
          </h3>
          <ul className="space-y-2 text-sm">
            {menuItems.map((l) => (
              <li key={l}>
                <Link href="/menu" className="hover:text-cyan-400 transition-colors">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Portal */}
        <div>
          <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">
            {t("publicFooter.portalTitle")}
          </h3>
          <ul className="space-y-2 text-sm">
            {portalLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-cyan-400 transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wide">
            {t("publicFooter.contactTitle")}
          </h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>info@theclubhouse.cr</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>+506 4000 0000</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>San José, Costa Rica</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800 py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} The Club House. {t("publicFooter.rights")}</p>
        <div className="flex gap-4">
          <Link href="#" className="hover:text-cyan-400 transition-colors">
            {t("publicFooter.privacy")}
          </Link>
          <Link href="#" className="hover:text-cyan-400 transition-colors">
            {t("publicFooter.terms")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
