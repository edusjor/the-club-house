import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const id = (session.user as { id?: string }).id;
  const role = (session.user as { role?: string }).role;

  if (!id) {
    return NextResponse.json({ role: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, isStaff: true },
  });

  return NextResponse.json({
    role,
    id,
    name: user?.name ?? null,
    isStaff: user?.isStaff ?? false,
  });
}
