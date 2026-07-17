import { auth } from "@/auth";
import Header from "@/components/dashboard/Header";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);

  const dict = await getDictionary(locale);
  const t = dict.vendor.profile;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6">
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.name}</div>
              <div className="mt-1 text-slate-900">{session.user.name ?? t.userFallback}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.email}</div>
              <div className="mt-1 text-slate-900">{session.user.email ?? ""}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}