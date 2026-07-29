import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { creditLimit } = await req.json();

  if (typeof creditLimit !== "number" || !Number.isInteger(creditLimit) || creditLimit < 0) {
    return NextResponse.json({ error: "El límite debe ser un número entero mayor o igual a 0" }, { status: 400 });
  }

  const parent = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!parent || parent.role !== "PARENT") {
    return NextResponse.json({ error: "Padre no encontrado" }, { status: 404 });
  }

  const balance = await prisma.parentBalance.upsert({
    where: { parentId: id },
    create: { parentId: id, pendingBalance: 0, approvedBalance: 0, creditLimit },
    update: { creditLimit },
  });

  return NextResponse.json(balance);
}
