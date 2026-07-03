import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true, name: true, email: true },
  });

  if (!currentUser || !currentUser.active) redirect("/login");

  const tokenRole = (session.user as { role?: string }).role;
  if (tokenRole !== currentUser.role) redirect("/login");
  if (currentUser.role !== "ADMIN") redirect("/unauthorized");

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
