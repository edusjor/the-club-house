"use client";

import { useSession } from "next-auth/react";
import Link from "@/i18n/Link";
import {
  ArrowRight,
  ChefHat,
  Leaf,
  Shield,
  Clock,
  UtensilsCrossed,
  Users,
  Package,
  CheckCircle,
  Heart,
  BookOpen,
  Activity,
  Phone,
} from "lucide-react";
import { useDictionary, useTranslations } from "@/i18n/I18nProvider";
import { getDashboardPath } from "@/lib/dashboard-path";

const featureIcons = [Leaf, ChefHat, Clock, Shield];
const featureColors = [
  "bg-emerald-100 text-emerald-600",
  "bg-cyan-100 text-cyan-600",
  "bg-orange-100 text-orange-600",
  "bg-violet-100 text-violet-600",
];

const usefulLinkIcons = [Heart, BookOpen, Activity, Phone];
const usefulLinkColors = [
  "bg-rose-100 text-rose-600",
  "bg-blue-100 text-blue-600",
  "bg-green-100 text-green-600",
  "bg-purple-100 text-purple-600",
];

const panelIcons = [Users, UtensilsCrossed, Package];
const panelColors = [
  "bg-purple-100 text-purple-600",
  "bg-cyan-100 text-cyan-600",
  "bg-orange-100 text-orange-600",
];

export default function HomePageContent() {
  const dict = useDictionary();
  const home = dict.publicHome;
  const t = useTranslations();
  const { data: session } = useSession();
  const dashboardHref = getDashboardPath(
    (session?.user as { role?: string } | undefined)?.role
  );

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--cream)]">
        <img
          src="/assets/logo.webp"
          alt="The Club House"
          className="absolute -top-1 right-6 z-10 w-24 shadow-lg sm:right-12 sm:w-32"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-36 pb-24 sm:pt-40 lg:pt-44 lg:pb-36">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] text-cyan-500">
                {home.hero.titleLine1}
                <br />
                {home.hero.titleLine2}
                <br />
                {home.hero.titleLine3}
              </h1>
              <p className="mt-6 max-w-md text-cyan-900/70 text-base sm:text-lg leading-relaxed">
                {home.hero.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-7 py-3.5 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-cyan-600"
                >
                  {home.hero.ctaMenu}
                </Link>
                <Link
                  href={session?.user ? dashboardHref : "/login"}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--cream-dark)] px-7 py-3.5 text-sm font-extrabold text-[var(--cocoa)] shadow-md transition-colors hover:bg-[#e2cfa9]"
                >
                  {session?.user ? t("publicNav.myPanel") : home.hero.ctaLogin}
                </Link>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <img
                src="/assets/plato-hero.webp"
                alt=""
                className="animate-float-slow w-full max-w-md drop-shadow-2xl lg:max-w-lg"
              />
            </div>
          </div>
        </div>

        <img
          src="/assets/logo-mano-barrabrava.webp"
          alt=""
          className="pointer-events-none absolute bottom-6 right-6 w-20 opacity-70 sm:right-10 sm:w-28"
        />
      </section>

      {/* Sponsor marquee */}
      <section className="pt-8 pb-8 bg-[var(--cocoa)] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-5">
          <p className="text-center text-cyan-400 text-base font-bold uppercase tracking-wider">
            {home.sponsors.title}
          </p>
        </div>
        <div className="overflow-hidden">
          <div className="flex animate-marquee gap-48 whitespace-nowrap">
            {[
              "/assets/logos/Logo 1008.webp",
              "/assets/logos/Logo Barra Brava (1).png",
              "/assets/logos/Logo Rulo Oficial (1).svg",
              "/assets/logos/Logo el spot creativo (1).webp",
              "/assets/logos/Logo innobeecr.webp",
              "/assets/logos/logo cam360.webp",
              "/assets/logos/Logo 1008.webp",
              "/assets/logos/Logo Barra Brava (1).png",
              "/assets/logos/Logo Rulo Oficial (1).svg",
              "/assets/logos/Logo el spot creativo (1).webp",
              "/assets/logos/Logo innobeecr.webp",
              "/assets/logos/logo cam360.webp",
            ].map((logo, i) => (
              <div
                key={i}
                className="flex w-48 items-center justify-center"
              >
                <img
                  src={logo}
                  alt={`Sponsor ${(i % 6) + 1}`}
                  className="h-16 max-w-48 object-contain opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[var(--cream)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-cyan-600 font-semibold text-sm uppercase tracking-wider mb-2">
              {home.features.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              {home.features.title}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {home.features.items.map((f, i) => {
              const Icon = featureIcons[i];
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-6 border border-slate-100 text-center"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${featureColors[i]}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Useful links */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-cyan-600 font-semibold text-sm uppercase tracking-wider mb-2">
              {home.usefulLinks.eyebrow}
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              {home.usefulLinks.title}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {home.usefulLinks.items.map((link, i) => {
              const Icon = usefulLinkIcons[i];
              return (
                <Link
                  key={link.title}
                  href={link.href}
                  className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-cyan-200 hover:shadow-lg transition-all group"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${usefulLinkColors[i]} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{link.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{link.desc}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Portal benefits */}
      <section className="py-16 bg-gradient-to-br from-cyan-600 to-cyan-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-cyan-200 font-semibold text-sm uppercase tracking-wider mb-3">
                {home.portalBenefits.eyebrow}
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
                {home.portalBenefits.title}
              </h2>
              <p className="text-cyan-50 text-lg leading-relaxed mb-8">
                {home.portalBenefits.subtitle}
              </p>
              <Link
                href={session?.user ? dashboardHref : "/login"}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-extrabold text-cyan-700 hover:bg-cyan-50 transition-colors"
              >
                {session?.user ? t("publicNav.myPanel") : home.portalBenefits.cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {home.portalBenefits.items.map((b) => (
                <div
                  key={b}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3"
                >
                  <CheckCircle className="w-5 h-5 text-cyan-200 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white font-medium">{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Panels overview */}
      <section className="py-16 bg-[var(--cream)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">
              {home.panels.title}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              {home.panels.subtitle}
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {home.panels.items.map((p, i) => {
              const Icon = panelIcons[i];
              return (
                <div
                  key={p.title}
                  className="bg-white rounded-2xl p-6 border border-slate-100"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${panelColors[i]}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    {p.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-4">
                    {p.desc}
                  </p>
                  <Link
                    href={session?.user ? dashboardHref : "/login"}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-600 hover:text-cyan-500 transition-colors"
                  >
                    {home.panels.access} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[var(--cocoa)] text-white text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-black mb-4 text-cyan-400">
            {home.cta.title}
          </h2>
          <p className="text-slate-200 text-lg mb-8">
            {home.cta.subtitle}
          </p>
          <Link
            href={session?.user ? dashboardHref : "/login"}
            className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-8 py-4 font-extrabold text-white transition-colors hover:bg-cyan-400"
          >
            {session?.user ? t("publicNav.myPanel") : home.cta.button}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
