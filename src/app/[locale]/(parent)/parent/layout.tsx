import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function ParentLayout({
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
    select: { id: true, role: true, active: true, name: true, email: true, isStaff: true },
  });

  if (!currentUser || !currentUser.active) redirect(`/${locale}/login`);

  const role = (session.user as { role?: string }).role;
  if (role !== currentUser.role) redirect(`/${locale}/login`);
  if (currentUser.role !== "PARENT" && currentUser.role !== "ADMIN") redirect(`/${locale}/unauthorized`);

  // Staff-only accounts see "Staff Portal"; staff with children see
  // "Parent/Staff Portal"; regular parents keep the default title.
  let titleKey: string | undefined;
  if (currentUser.isStaff) {
    const childrenCount = await prisma.student.count({
      where: { parentId: userId, user: { role: "STUDENT" } },
    });
    titleKey = childrenCount > 0 ? "nav.parent.titleParentStaff" : "nav.parent.titleStaff";
  }

  return (
    <DashboardShell
      role="PARENT"
      userName={currentUser.name ?? undefined}
      userEmail={currentUser.email ?? undefined}
      titleKey={titleKey}
    >
      {children}
    </DashboardShell>
  );
}
