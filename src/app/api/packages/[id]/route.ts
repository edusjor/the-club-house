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
  const body = await req.json();
  const { name, description, validityDays, status, rules, items, prices } = body;

  await prisma.packageItem.deleteMany({ where: { packageId: id } });
  await prisma.packagePrice.deleteMany({ where: { packageId: id } });

  const updated = await prisma.package.update({
    where: { id },
    data: {
      name,
      description,
      validityDays,
      status,
      rules,
      packageItems: {
        create: (items ?? []).map((item: { categoryId: string }) => ({
          categoryId: item.categoryId,
        })),
      },
      prices: {
        create: (prices ?? []).map((p: { level: string; price: number }) => ({
          level: p.level,
          price: p.price,
        })),
      },
    },
    include: { packageItems: { include: { category: true } }, prices: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.packageItem.deleteMany({ where: { packageId: id } });
  await prisma.packagePrice.deleteMany({ where: { packageId: id } });
  await prisma.package.delete({ where: { id } });
  return NextResponse.json({ success: true });
}