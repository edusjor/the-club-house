import { prisma } from "@/lib/db";
import Link from "@/i18n/Link";
import { Info } from "lucide-react";
import PublicMenuBrowser from "./PublicMenuBrowser";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

async function getMenuItems() {
  return prisma.foodItem.findMany({
    where: { available: true },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
}

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const [items, dict] = await Promise.all([getMenuItems(), getDictionary(locale)]);
  const t = dict.publicMenu;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-cyan-900 text-white py-14 px-4 sm:px-6 text-center">
        <p className="text-cyan-400 font-semibold text-sm uppercase tracking-wider mb-2">
          {t.eyebrow}
        </p>
        <h1 className="text-4xl sm:text-5xl font-black mb-4">
          {t.title}
        </h1>
        <p className="text-slate-300 text-lg max-w-xl mx-auto">
          {t.subtitle}
        </p>
        <div className="mt-8 inline-flex items-center gap-2 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 px-4 py-2 rounded-full text-sm">
          <Info className="w-4 h-4" />
          {t.loginNotice}{" "}
          <Link href="/login" className="underline font-semibold hover:text-white">
            {t.loginLink}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-lg font-semibold">{t.emptyTitle}</p>
            <p className="text-sm mt-2">{t.emptySubtitle}</p>
          </div>
        ) : (
          <PublicMenuBrowser items={items} />
        )}
      </div>
    </div>
  );
}
