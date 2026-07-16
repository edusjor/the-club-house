import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const imageByName: Record<string, string> = {
  "pancakes con frutas": "https://loremflickr.com/1350/1080/pancakes,fruit?lock=1101",
  "pollo a la plancha con ensalada": "https://loremflickr.com/1350/1080/grilled,chicken,salad?lock=1102",
  "pasta bolonesa": "https://loremflickr.com/1350/1080/pasta,bolognese?lock=1103",
  "smoothie de mango": "https://loremflickr.com/1350/1080/mango,smoothie?lock=1104",
  "galletas integrales": "https://loremflickr.com/1350/1080/cookies,wholegrain?lock=1105",
  "omelette de espinaca": "https://loremflickr.com/1350/1080/omelette,spinach?lock=1106",
  "tostadas francesas": "https://loremflickr.com/1350/1080/french,toast?lock=1107",
  "arroz con pollo": "https://loremflickr.com/1350/1080/chicken,rice?lock=1108",
  "casado de carne": "https://loremflickr.com/1350/1080/beef,rice,beans?lock=1109",
  "wrap de pollo": "https://loremflickr.com/1350/1080/chicken,wrap?lock=1110",
  "sandwich de pavo": "https://loremflickr.com/1350/1080/turkey,sandwich?lock=1111",
  "yogur con granola": "https://loremflickr.com/1350/1080/yogurt,granola?lock=1112",
  "fruta picada": "https://loremflickr.com/1350/1080/fruit,bowl?lock=1113",
  "jugo de naranja natural": "https://loremflickr.com/1350/1080/orange,juice?lock=1114",
  "chocolate caliente": "https://loremflickr.com/1350/1080/hot,chocolate?lock=1115",
  "agua saborizada": "https://loremflickr.com/1350/1080/flavored,water,drink?lock=1116",
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function main() {
  console.log("Asignando imagenes de internet al menu de demo...");

  const menuItems = await prisma.foodItem.findMany({
    select: {
      id: true,
      name: true,
      category: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (menuItems.length === 0) {
    console.log("No hay comidas para actualizar.");
    return;
  }

  let updated = 0;

  for (const item of menuItems) {
    const normalizedName = normalize(item.name);
    const exactImage = imageByName[normalizedName];

    const fallbackByCategory = `https://loremflickr.com/1350/1080/${normalize(item.category.name).replace(/\s+/g, ",")},food?lock=${2000 + updated}`;
    const image = exactImage ?? fallbackByCategory;

    await prisma.foodItem.update({
      where: { id: item.id },
      data: { image },
    });

    updated += 1;
    console.log(`- ${item.name}: OK`);
  }

  console.log(`Listo. ${updated} comidas con imagen.`);
}

main()
  .catch((error) => {
    console.error("Error al asignar imagenes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
