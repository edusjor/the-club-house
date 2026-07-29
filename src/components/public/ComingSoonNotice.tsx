import { Clock3, Sparkles } from "lucide-react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { formatCostaRicaDateTime } from "@/lib/coming-soon-date";

export default function ComingSoonNotice({
  t,
  locale,
  launchAt,
}: {
  t: Dictionary["publicComingSoon"];
  locale: Locale;
  launchAt: Date | null;
}) {
  const launchDate = launchAt ? formatCostaRicaDateTime(launchAt, locale) : null;

  return (
    <section className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden bg-[var(--cream)] px-4 py-24 text-center">
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
    </section>
  );
}
