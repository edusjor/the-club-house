import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  const payments =
    role === "ADMIN" || role === "VENDOR"
      ? await prisma.payment.findMany({
          include: {
            parent: {
              select: {
                name: true,
                email: true,
                parentBalance: { select: { pendingBalance: true, creditBalance: true } },
              },
            },
            order: { select: { id: true, total: true } },
            approvedBy: { select: { name: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.payment.findMany({
          where: { parentId: userId },
          include: {
            order: { select: { id: true, total: true } },
          },
          orderBy: { createdAt: "desc" },
        });

  return NextResponse.json(payments);
}
