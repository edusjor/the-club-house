import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Limpiando ordenes de prueba antes de salir a produccion...");

  const [orderItemCount, paymentCount, orderCount, activityLogCount] = await Promise.all([
    prisma.orderItem.count(),
    prisma.payment.count(),
    prisma.order.count(),
    prisma.activityLog.count(),
  ]);

  console.log(
    `Se van a borrar: ${orderItemCount} order items, ${paymentCount} pagos, ${orderCount} ordenes, ${activityLogCount} logs de actividad.`
  );
  console.log("Tambien se van a resetear balances de padres y consumo de paquetes.");

  await prisma.orderItem.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.activityLog.deleteMany({});

  const balances = await prisma.parentBalance.updateMany({
    data: { pendingBalance: 0, approvedBalance: 0 },
  });
  const packages = await prisma.studentPackage.updateMany({
    data: { consumed: 0 },
  });

  console.log(`Listo. Balances reseteados: ${balances.count}. Paquetes reseteados: ${packages.count}.`);
}

main()
  .catch((error) => {
    console.error("Error al limpiar ordenes:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
