import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Header from "@/components/dashboard/Header";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { formatDateTime } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";
import { isLocale } from "@/i18n/config";
import { notFound } from "next/navigation";

export default async function ParentNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect(`/${locale}/login`);

  const [notifications, dict] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    getDictionary(locale),
  ]);
  const t = dict.parent.notifications;

  return (
    <div>
      <Header title={t.title} subtitle={t.subtitle} />
      <div className="p-6 space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold text-slate-900">{notification.title}</div>
                <div className="text-sm text-slate-600">{notification.message}</div>
                <div className="mt-1 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</div>
              </div>
              <StatusBadge status={notification.read ? "ACTIVE" : "PENDING"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}