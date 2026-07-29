import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { buildFixedMenuPrices } from "./price-levels";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed de datos...");

  // Clean previous data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.studentPackage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.foodItemPrice.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.packageItem.deleteMany();
  await prisma.package.deleteMany();
  await prisma.foodCategory.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const adminPw = await bcrypt.hash("Admin123!", 12);
  const parentPw = await bcrypt.hash("Parent123!", 12);
  const vendorPw = await bcrypt.hash("Vendor123!", 12);
  const studentPw = await bcrypt.hash("Student123!", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador The Club House",
      email: "admin@theclubhouse.cr",
      password: adminPw,
      role: "ADMIN",
      active: true,
    },
  });

  const parent1 = await prisma.user.create({
    data: {
      name: "María Cortés",
      email: "maria@example.com",
      password: parentPw,
      role: "PARENT",
      phone: "+506 8765 4321",
      active: true,
    },
  });

  const parent2 = await prisma.user.create({
    data: {
      name: "Carlos López",
      email: "carlos@example.com",
      password: parentPw,
      role: "PARENT",
      phone: "+506 8765 4322",
      active: true,
    },
  });

  const vendor = await prisma.user.create({
    data: {
      name: "Juan Vendedor",
      email: "vendor@theclubhouse.cr",
      password: vendorPw,
      role: "VENDOR",
      phone: "+506 8765 0000",
      active: true,
    },
  });

  console.log("✅ Usuarios creados:", { admin: admin.id, parent1: parent1.id, parent2: parent2.id, vendor: vendor.id });

  // Create food categories
  const categories = await Promise.all([
    prisma.foodCategory.create({
      data: { name: "Breakfast", color: "#f59e0b", description: "Morning meals" },
    }),
    prisma.foodCategory.create({
      data: { name: "Lunch", color: "#3b82f6", description: "Main midday meal" },
    }),
    prisma.foodCategory.create({
      data: { name: "Snack", color: "#8b5cf6", description: "Afternoon snack" },
    }),
    prisma.foodCategory.create({
      data: { name: "Drinks", color: "#ec4899", description: "Drinks" },
    }),
  ]);

  console.log("✅ Categorías creadas:", categories.length);

  // Create food items
  const items = await Promise.all([
    prisma.foodItem.create({
      data: {
        name: "Pancakes with Fruit",
        description: "Delicious pancakes served with fresh fruit",
        categoryId: categories[0].id,
        available: true,
        tags: JSON.stringify(["healthy", "vegetarian"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 2400 },
            { level: "ELEMENTARY", price: 2900 },
            { level: "MIDDLE_HIGH", price: 3200 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Grilled Chicken with Salad",
        description: "Fresh chicken breast served with green salad",
        categoryId: categories[1].id,
        available: true,
        tags: JSON.stringify(["healthy", "gluten-free"]),
        prices: {
          create: [
            { level: "ELEMENTARY", price: 3500 },
            { level: "MIDDLE_HIGH", price: 4200 },
            { level: "ADULT", price: 4500 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Pasta Bolognese",
        description: "Fresh pasta with homemade bolognese sauce",
        categoryId: categories[1].id,
        available: true,
        tags: JSON.stringify(["healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 3200 },
            { level: "ELEMENTARY", price: 3500 },
            { level: "MIDDLE_HIGH", price: 4000 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Mango Smoothie",
        description: "Natural mango drink with no added sugar",
        categoryId: categories[3].id,
        available: true,
        tags: JSON.stringify(["vegetarian", "healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 1000 },
            { level: "ELEMENTARY", price: 1200 },
            { level: "MIDDLE_HIGH", price: 1500 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Whole Wheat Cookies",
        description: "Cookies made with whole wheat flour",
        categoryId: categories[2].id,
        available: true,
        tags: JSON.stringify(["vegetarian", "healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 800 },
            { level: "ELEMENTARY", price: 1000 },
            { level: "MIDDLE_HIGH", price: 1200 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Spinach Omelette",
        description: "Eggs with spinach and low-fat cheese",
        categoryId: categories[0].id,
        available: true,
        tags: JSON.stringify(["healthy", "gluten-free"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 2100 },
            { level: "ELEMENTARY", price: 2500 },
            { level: "MIDDLE_HIGH", price: 2900 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "French Toast",
        description: "Golden whole wheat bread with honey and fruit",
        categoryId: categories[0].id,
        available: true,
        tags: JSON.stringify(["vegetarian"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 2200 },
            { level: "ELEMENTARY", price: 2600 },
            { level: "MIDDLE_HIGH", price: 3000 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Rice with Chicken",
        description: "Seasoned rice with chicken and mixed vegetables",
        categoryId: categories[1].id,
        available: true,
        tags: JSON.stringify(["healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 3000 },
            { level: "ELEMENTARY", price: 3600 },
            { level: "MIDDLE_HIGH", price: 4100 },
            { level: "ADULT", price: 4600 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Beef Casado",
        description: "Beef in sauce with rice, beans and salad",
        categoryId: categories[1].id,
        available: true,
        tags: JSON.stringify(["healthy"]),
        prices: {
          create: [
            { level: "ELEMENTARY", price: 3700 },
            { level: "MIDDLE_HIGH", price: 4300 },
            { level: "ADULT", price: 4800 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Chicken Wrap",
        description: "Whole wheat wrap with chicken, lettuce and light dressing",
        categoryId: categories[1].id,
        available: true,
        tags: JSON.stringify(["healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 2800 },
            { level: "ELEMENTARY", price: 3400 },
            { level: "MIDDLE_HIGH", price: 3900 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Turkey Sandwich",
        description: "Whole wheat bread with turkey, tomato and cheese",
        categoryId: categories[2].id,
        available: true,
        tags: JSON.stringify(["healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 1500 },
            { level: "ELEMENTARY", price: 1800 },
            { level: "MIDDLE_HIGH", price: 2100 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Yogurt with Granola",
        description: "Natural yogurt with granola and chopped fruit",
        categoryId: categories[2].id,
        available: true,
        tags: JSON.stringify(["vegetarian", "healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 1200 },
            { level: "ELEMENTARY", price: 1500 },
            { level: "MIDDLE_HIGH", price: 1800 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Chopped Fruit",
        description: "Mix of fresh seasonal fruit",
        categoryId: categories[2].id,
        available: true,
        tags: JSON.stringify(["vegetarian", "healthy", "gluten-free"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 900 },
            { level: "ELEMENTARY", price: 1100 },
            { level: "MIDDLE_HIGH", price: 1300 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Fresh Orange Juice",
        description: "Fresh juice with no added sugar",
        categoryId: categories[3].id,
        available: true,
        tags: JSON.stringify(["vegetarian", "healthy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 900 },
            { level: "ELEMENTARY", price: 1100 },
            { level: "MIDDLE_HIGH", price: 1300 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Hot Chocolate",
        description: "Hot cocoa drink with milk",
        categoryId: categories[3].id,
        available: true,
        tags: JSON.stringify(["dairy"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 1000 },
            { level: "ELEMENTARY", price: 1200 },
            { level: "MIDDLE_HIGH", price: 1400 },
          ],
        },
      },
    }),
    prisma.foodItem.create({
      data: {
        name: "Flavored Water",
        description: "Water with natural fruit and mint",
        categoryId: categories[3].id,
        available: true,
        tags: JSON.stringify(["vegetarian", "healthy", "gluten-free"]),
        prices: {
          create: [
            { level: "PRESCHOOL", price: 700 },
            { level: "ELEMENTARY", price: 900 },
            { level: "MIDDLE_HIGH", price: 1100 },
          ],
        },
      },
    }),
  ]);

  console.log("✅ Comidas creadas:", items.length);

  const menuWithLegacyPrices = await prisma.foodItem.findMany({
    select: {
      id: true,
      prices: {
        select: {
          level: true,
          price: true,
        },
      },
    },
  });

  for (const menuItem of menuWithLegacyPrices) {
    const normalizedPrices = buildFixedMenuPrices(menuItem.prices);

    await prisma.foodItemPrice.deleteMany({
      where: { foodItemId: menuItem.id },
    });

    await prisma.foodItemPrice.createMany({
      data: normalizedPrices.map((price) => ({
        foodItemId: menuItem.id,
        level: price.level,
        price: price.price,
      })),
    });
  }

  console.log("✅ Menu de prueba normalizado a 4 tipos de precio");

  // Create packages
  const pkg1 = await prisma.package.create({
    data: {
      name: "Paquete Mensual Básico",
      description: "1 comida por día durante un mes",
      validityDays: 30,
      status: "ACTIVE",
      packageItems: {
        create: [{ categoryId: categories[1].id }],
      },
      prices: {
        create: [
          { level: "ELEMENTARY", price: 25000 },
          { level: "MIDDLE_HIGH", price: 0 },
          { level: "STAFF", price: 0 },
          { level: "ATHLETES", price: 0 },
        ],
      },
    },
  });

  const pkg2 = await prisma.package.create({
    data: {
      name: "Paquete Semanal Completo",
      description: "5 almuerzos + 5 bebidas",
      validityDays: 7,
      status: "ACTIVE",
      packageItems: {
        create: [
          { categoryId: categories[1].id },
          { categoryId: categories[3].id },
        ],
      },
      prices: {
        create: [
          { level: "ELEMENTARY", price: 0 },
          { level: "MIDDLE_HIGH", price: 8500 },
          { level: "STAFF", price: 0 },
          { level: "ATHLETES", price: 0 },
        ],
      },
    },
  });

  console.log("✅ Paquetes creados:", [pkg1.id, pkg2.id]);

  // Create students
  const studentUser1 = await prisma.user.create({
    data: {
      name: "Mateo Cortés",
      email: "mateo@example.com",
      password: studentPw,
      role: "STUDENT",
      active: true,
    },
  });

  const studentUser2 = await prisma.user.create({
    data: {
      name: "Sofia Cortés",
      email: "sofia@example.com",
      password: studentPw,
      role: "STUDENT",
      active: true,
    },
  });

  const studentUser3 = await prisma.user.create({
    data: {
      name: "Lucía López",
      email: "lucia@example.com",
      password: studentPw,
      role: "STUDENT",
      active: true,
    },
  });

  const student1 = await prisma.student.create({
    data: {
      userId: studentUser1.id,
      name: "Mateo Cortés",
      level: "ELEMENTARY",
      parentId: parent1.id,
      active: true,
      allergies: "Maní, sin huevo",
    },
  });

  const student2 = await prisma.student.create({
    data: {
      userId: studentUser2.id,
      name: "Sofia Cortés",
      level: "ELEMENTARY",
      parentId: parent1.id,
      active: true,
      allergies: "Ninguna",
    },
  });

  const student3 = await prisma.student.create({
    data: {
      userId: studentUser3.id,
      name: "Lucía López",
      level: "MIDDLE_HIGH",
      parentId: parent2.id,
      active: true,
      allergies: "Lácteos, vegetariana",
    },
  });

  console.log("✅ Estudiantes creados:", [student1.id, student2.id, student3.id]);

  // Create student packages
  const sp1 = await prisma.studentPackage.create({
    data: {
      studentId: student1.id,
      packageId: pkg1.id,
      startDate: new Date(),
      consumed: 0,
      status: "ACTIVE",
    },
  });

  console.log("✅ Paquetes estudiantiles creados:", [sp1.id]);

  // Create sample orders
  const order1 = await prisma.order.create({
    data: {
      parentId: parent1.id,
      status: "PENDING",
      total: 7500,
      items: {
        create: [
          {
            studentId: student1.id,
            foodItemId: items[1].id,
            scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)),
            quantity: 1,
            price: 3500,
          },
          {
            studentId: student2.id,
            foodItemId: items[0].id,
            scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)),
            quantity: 1,
            price: 2400,
          },
          {
            studentId: student1.id,
            foodItemId: items[3].id,
            scheduledDate: new Date(new Date().setDate(new Date().getDate() + 1)),
            quantity: 2,
            price: 1200,
          },
        ],
      },
    },
  });

  console.log("✅ Órdenes creadas:", [order1.id]);

  // Create sample payment
  const payment1 = await prisma.payment.create({
    data: {
      parentId: parent1.id,
      orderId: order1.id,
      amount: 7500,
      status: "PENDING",
      receipt: "comprobante-sinpe-12345.jpg",
    },
  });

  console.log("✅ Pagos creados:", [payment1.id]);

  console.log("\n🎉 ¡Seed completado con éxito!");
  console.log("\n📝 Credenciales de prueba:");
  console.log("   Admin: admin@theclubhouse.cr / Admin123!");
  console.log("   Parent: maria@example.com / Parent123!");
  console.log("   Vendor: vendor@theclubhouse.cr / Vendor123!");
  console.log("   Student: mateo@example.com / Student123!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
