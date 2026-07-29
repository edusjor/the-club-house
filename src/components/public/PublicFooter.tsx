"use client";

import Link from "@/i18n/Link";
import { Mail, Phone, MapPin, Globe, AtSign, MessageCircle } from "lucide-react";
import { useTranslations } from "@/i18n/I18nProvider";

export default function PublicFooter() {
  const t = useTranslations();

  // "Guide" is a fixed English label — it links to the English-only quick
  // guide, so it isn't run through translation like the other footer links.
  const portalLinks = [
    { href: "/login", label: t("publicFooter.portalSignIn") },
    { href: "/guide", label: "Guide" },
  ];

  return (
    <footer className="bg-[var(--cocoa)] text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <img
              src="/assets/logo.webp"
              alt="The Club House"
              className="h-10 w-10 rounded-xl object-cover"
            />
            <p className="text-cyan-400 text-[10px] uppercase tracking-widest">
              {t("auth.layout.tagline")}
            </p>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
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
              <span>support@theclubhousecr.com</span>
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

      <div className="border-t border-slate-800 py-5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
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
