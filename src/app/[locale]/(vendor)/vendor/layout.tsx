import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { localePath } from "@/i18n/config";

export default async function VendorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(localePath(locale, "/login"));
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect(localePath(locale, "/login"));

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, name: true, email: true },
  });

  if (!currentUser || !currentUser.active) redirect(localePath(locale, "/login"));

  const tokenRole = (session.user as { role?: string }).role;
  if (tokenRole !== currentUser.role) redirect(localePath(locale, "/login"));
  if (currentUser.role !== "VENDOR" && currentUser.role !== "ADMIN") redirect(localePath(locale, "/unauthorized"));

  return (
    <DashboardShell
      role="VENDOR"
      userName={currentUser.name ?? undefined}
      userEmail={currentUser.email ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}
