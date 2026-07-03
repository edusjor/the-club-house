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
  const { name, image, description, categoryId, ingredients, tags, available, stockQuantity, prices } = body;

  await prisma.foodItemPrice.deleteMany({ where: { foodItemId: id } });

  const item = await prisma.foodItem.update({
    where: { id },
    data: {
      name, image, description, categoryId, ingredients,
      tags: tags ? JSON.stringify(tags) : null,
      available,
      stockQuantity,
      prices: {
        create: (prices ?? []).map((p: { level: string; price: number }) => ({
          level: p.level,
          price: p.price,
        })),
      },
    },
    include: { category: true, prices: true },
  });

  return NextResponse.json(item);
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
  await prisma.foodItemPrice.deleteMany({ where: { foodItemId: id } });
  await prisma.foodItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
