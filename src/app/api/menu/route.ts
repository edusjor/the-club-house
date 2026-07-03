import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const items = await prisma.foodItem.findMany({
    include: { category: true, prices: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, image, description, categoryId, ingredients, tags, available, availableDays, stockQuantity, prices } = body;

  const item = await prisma.foodItem.create({
    data: {
      name,
      image,
      description,
      categoryId,
      ingredients,
      tags: tags ? JSON.stringify(tags) : null,
      available: available ?? true,
      availableDays: availableDays ? JSON.stringify(availableDays) : null,
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

  return NextResponse.json(item, { status: 201 });
}
