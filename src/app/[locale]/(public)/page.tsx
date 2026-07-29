import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/site-settings";
import ComingSoonNotice from "@/components/public/ComingSoonNotice";
import HomePageContent from "./HomePageContent";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [dict, settings] = await Promise.all([getDictionary(locale), getSiteSettings()]);

  if (settings.comingSoonEnabled) {
    return (
      <ComingSoonNotice
        t={dict.publicComingSoon}
        locale={locale}
        launchAt={settings.comingSoonAt}
      />
    );
  }

  return <HomePageContent />;
}
