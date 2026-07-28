import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { isMealPeriod } from "@/lib/meal-scheduling";
import { isFoodTab } from "@/lib/food-tabs";
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
  const { name, image, description, categoryId, ingredients, tags, available, availableDays, stockQuantity, fixedMealPeriod, foodTab, prices } = body;

  if (fixedMealPeriod !== null && fixedMealPeriod !== undefined && !isMealPeriod(fixedMealPeriod)) {
    return NextResponse.json({ error: "Tiempo de comida inválido" }, { status: 400 });
  }

  if (foodTab !== null && foodTab !== undefined && !isFoodTab(foodTab)) {
    return NextResponse.json({ error: "Pestaña de menú inválida" }, { status: 400 });
  }

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
      fixedMealPeriod: fixedMealPeriod ?? null,
      foodTab: foodTab ?? null,
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
