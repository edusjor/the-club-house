import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/login`);
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect(`/${locale}/login`);

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, name: true, email: true },
  });

  if (!currentUser || !currentUser.active) redirect(`/${locale}/login`);

  const tokenRole = (session.user as { role?: string }).role;
  if (tokenRole !== currentUser.role) redirect(`/${locale}/login`);
  if (currentUser.role !== "ADMIN") redirect(`/${locale}/unauthorized`);

  return (
    <DashboardShell
      role="ADMIN"
      userName={currentUser.name ?? undefined}
      userEmail={currentUser.email ?? undefined}
    >
      {children}
    </DashboardShell>
  );
}
