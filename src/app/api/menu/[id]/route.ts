import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { isMealPeriod } from "@/lib/meal-scheduling";
import { isFoodTab } from "@/lib/food-tabs";
import { isFoodVisibility } from "@/lib/food-visibility";
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
  const { name, image, description, categoryId, ingredients, tags, available, stockQuantity, fixedMealPeriod, foodTab, visibility, prices } = body;

  if (fixedMealPeriod !== null && fixedMealPeriod !== undefined && !isMealPeriod(fixedMealPeriod)) {
    return NextResponse.json({ error: "Tiempo de comida inválido" }, { status: 400 });
  }

  if (foodTab !== null && foodTab !== undefined && !isFoodTab(foodTab)) {
    return NextResponse.json({ error: "Pestaña de menú inválida" }, { status: 400 });
  }

  if (visibility !== null && visibility !== undefined && !isFoodVisibility(visibility)) {
    return NextResponse.json({ error: "Visibilidad de menú inválida" }, { status: 400 });
  }

  await prisma.foodItemPrice.deleteMany({ where: { foodItemId: id } });

  const item = await prisma.foodItem.update({
    where: { id },
    data: {
      name, image, description, categoryId, ingredients,
      tags: tags ? JSON.stringify(tags) : null,
      available,
      stockQuantity,
      fixedMealPeriod: fixedMealPeriod ?? null,
      foodTab: foodTab ?? null,
      visibility: visibility ?? "ALL",
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

  try {
    await prisma.foodItemPrice.deleteMany({ where: { foodItemId: id } });
    await prisma.foodItem.delete({ where: { id } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        {
          error:
            "No se puede eliminar: este platillo ya está asociado a pedidos existentes. Márcalo como no disponible en su lugar.",
        },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({ success: true });
}
