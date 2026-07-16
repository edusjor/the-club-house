import { PrismaClient } from "@prisma/client";
import { buildFixedMenuPrices } from "./price-levels";

const prisma = new PrismaClient();

async function main() {
  console.log("Normalizando precios del menu a 4 tipos fijos...");

  const foodItems = await prisma.foodItem.findMany({
    select: {
      id: true,
      name: true,
      prices: {
        select: {
          level: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (foodItems.length === 0) {
    console.log("No hay comidas en el menu para actualizar.");
    return;
  }

  for (const item of foodItems) {
    const fixedPrices = buildFixedMenuPrices(item.prices);

    await prisma.foodItemPrice.deleteMany({ where: { foodItemId: item.id } });
    await prisma.foodItemPrice.createMany({
      data: fixedPrices.map((price) => ({
        foodItemId: item.id,
        level: price.level,
        price: price.price,
      })),
    });

    console.log(`- ${item.name}: ${fixedPrices.map((p) => `${p.level}=${p.price}`).join(" | ")}`);
  }

  console.log(`Listo. ${foodItems.length} comidas actualizadas.`);
}

main()
  .catch((error) => {
    console.error("Error al normalizar precios:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
