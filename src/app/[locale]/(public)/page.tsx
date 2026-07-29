import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import ComingSoonNotice from "@/components/public/ComingSoonNotice";
import PublicShell from "@/components/public/PublicShell";
import HomePageContent from "./HomePageContent";

// Reads the coming-soon flag from the DB on every request — without this the
// homepage gets statically prerendered at build time and toggling the flag
// in the admin panel has no visible effect until the next deploy.
export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, settings] = await Promise.all([getDictionary(locale), getSiteSettings()]);

  // While "coming soon" is on, the homepage is just the notice — no nav,
  // no footer, nothing else. Every other route keeps its normal chrome.
  if (settings.comingSoonEnabled) {
    return (
      <ComingSoonNotice
        t={dict.publicComingSoon}
        locale={locale}
        launchAt={settings.comingSoonAt}
      />
    );
  }

  return (
    <PublicShell>
      <HomePageContent />
    </PublicShell>
  );
}
