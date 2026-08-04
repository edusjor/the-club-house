import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import ProfileSettingsForm from "@/components/dashboard/ProfileSettingsForm";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale, localePath } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function ParentProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session?.user || !userId) redirect(localePath(locale, "/login"));

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, cedula: true },
  });
  if (!currentUser) redirect(localePath(locale, "/login"));

  const dict = await getDictionary(locale);
  const t = dict.parent.profile;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 space-y-6">
        <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.name}</div>
              <div className="mt-1 text-slate-900">{currentUser.name ?? t.userFallback}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t.email}</div>
              <div className="mt-1 text-slate-900">{currentUser.email ?? ""}</div>
            </div>
          </div>
        </div>

        <ProfileSettingsForm initialEmail={currentUser.email ?? ""} initialCedula={currentUser.cedula ?? ""} />
      </div>
    </div>
  );
}
