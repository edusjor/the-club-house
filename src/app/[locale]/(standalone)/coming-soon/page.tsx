import { Clock3, Sparkles } from "lucide-react";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath } from "@/i18n/config";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import { formatCostaRicaDateTime } from "@/lib/coming-soon-date";

export default async function ComingSoonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, settings] = await Promise.all([getDictionary(locale), getSiteSettings()]);
  const t = dict.publicComingSoon;

  const launchDate = settings.comingSoonAt
    ? formatCostaRicaDateTime(settings.comingSoonAt, locale)
    : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--cream)] px-4 py-16 text-center">
      <img
        src="/assets/logo.webp"
        alt="The Club House"
        className="mb-8 h-24 w-24 rounded-2xl object-cover shadow-lg"
      />

      <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-700 shadow-sm">
        <Sparkles className="h-3.5 w-3.5" />
        {t.eyebrow}
      </p>

      <h1 className="max-w-2xl text-4xl font-black leading-tight text-cyan-500 sm:text-5xl">
        {t.title}
      </h1>

      <p className="mt-5 max-w-md text-base leading-relaxed text-cyan-900/70 sm:text-lg">
        {t.subtitle}
      </p>

      <div className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-md">
        <Clock3 className="h-5 w-5 flex-shrink-0 text-cyan-500" />
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.launchLabel}
          </p>
          <p className="font-bold text-slate-900">{launchDate ?? t.noDateFallback}</p>
        </div>
      </div>

      <img
        src="/assets/logo-mano-barrabrava.webp"
        alt=""
        className="pointer-events-none absolute bottom-6 right-6 w-20 opacity-70 sm:right-10 sm:w-28"
      />

      {/*
        Plain <a>, not the i18n Link: this page is reached via a proxy
        rewrite (the browser URL never actually becomes "/coming-soon"),
        which leaves the client router's segment cache out of sync and
        swallows client-side navigations. A full page load re-enters the
        proxy cleanly and lands on the real /login page.
      */}
      <a
        href={localePath(locale, "/login")}
        className="mt-12 text-xs font-semibold text-cyan-900/40 underline-offset-4 hover:text-cyan-700 hover:underline"
      >
        {t.signIn}
      </a>
    </div>
  );
}
