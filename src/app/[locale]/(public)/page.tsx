"use client";

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
import { useDictionary } from "@/i18n/I18nProvider";

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

export default function HomePage() {
  const dict = useDictionary();
  const home = dict.publicHome;

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-cyan-400 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-cyan-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-cyan-500/25 border border-cyan-300/45 rounded-full text-cyan-100 text-xs font-semibold mb-6">
                <Leaf className="w-3.5 h-3.5" />
                {home.hero.badge}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
                {home.hero.titlePart1}{" "}
                <span className="text-cyan-400">{home.hero.titleHighlight}</span>{" "}
                {home.hero.titlePart2}
              </h1>
              <p className="text-slate-200 text-lg leading-relaxed mb-8 max-w-lg">
                {home.hero.subtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-colors"
                >
                  {home.hero.ctaMenu}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors backdrop-blur-sm"
                >
                  {home.hero.ctaLogin}
                </Link>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-white/10">
                {home.stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-black text-cyan-400">{s.value}</p>
                    <p className="text-xs text-slate-300 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sponsor marquee */}
      <section className="py-8 bg-slate-900 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-4">
          <p className="text-center text-slate-400 text-sm font-semibold uppercase tracking-wider">
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
      <section className="py-16 bg-slate-50">
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
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-cyan-700 font-bold rounded-xl hover:bg-cyan-50 transition-colors"
              >
                {home.portalBenefits.cta}
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
      <section className="py-16 bg-slate-50">
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
                    href="/login"
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
      <section className="py-16 bg-slate-900 text-white text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            {home.cta.title}
          </h2>
          <p className="text-slate-200 text-lg mb-8">
            {home.cta.subtitle}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-white font-bold rounded-xl transition-colors"
          >
            {home.cta.button}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
