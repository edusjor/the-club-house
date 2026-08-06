import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "VENDOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parents = await prisma.user.findMany({
    where: { role: "PARENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      active: true,
      parentBalance: {
        select: { pendingBalance: true, approvedBalance: true, creditBalance: true, creditLimit: true },
      },
      parentStudents: {
        where: { active: true },
        select: { name: true },
        orderBy: { name: "asc" },
      },
    },
  });

  // Parents without a ParentBalance row yet (never ordered) default to a
  // fresh 0-pending balance at the standard credit limit.
  const balances = parents.map((parent) => {
    const pendingBalance = parent.parentBalance?.pendingBalance ?? 0;
    const approvedBalance = parent.parentBalance?.approvedBalance ?? 0;
    const creditBalance = parent.parentBalance?.creditBalance ?? 0;
    const creditLimit = parent.parentBalance?.creditLimit ?? 100000;

    return {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      phone: parent.phone,
      active: parent.active,
      // Surfaced so the admin can search by a child's name and still land
      // on (and visually confirm) the parent's balance row.
      children: parent.parentStudents.map((student) => student.name),
      pendingBalance,
      approvedBalance,
      creditBalance,
      creditLimit,
      available: Math.max(0, creditLimit - pendingBalance),
      overLimitBy: Math.max(0, pendingBalance - creditLimit),
    };
  });

  return NextResponse.json(balances);
}
