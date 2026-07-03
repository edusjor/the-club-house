import { prisma } from "@/lib/db";

type CoverageDb = Pick<
  typeof prisma,
  "student" | "foodItem" | "studentPackage" | "orderItem"
>;

const ORDER_STATUSES_FOR_COVERAGE = ["PAID", "PREPARING"] as const;

export type CoverageType = "ORDER" | "PACKAGE" | "CHARGE";

export class CoverageError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "COVERAGE_ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function getDayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start, end };
}

function resolveUnitPrice(
  prices: { level: string; price: number }[],
  level: string
) {
  const exact = prices.find((price) => price.level === level);
  if (exact) return exact.price;

  if (prices.length === 0) return null;

  return [...prices].sort((a, b) => a.price - b.price)[0].price;
}

export type ConsumptionCoverageResult = {
  coverageType: CoverageType;
  unitPrice: number;
  message: string;
  student: {
    id: string;
    name: string;
    level: string;
    grade: string;
    parentId: string;
    parentName: string;
    allergies: string | null;
    restrictions: string | null;
  };
  foodItem: {
    id: string;
    name: string;
    categoryId: string;
    categoryName: string;
  };
  orderItem?: {
    id: string;
    orderId: string;
    quantity: number;
    scheduledDate: Date;
    orderStatus: string;
  };
  studentPackage?: {
    id: string;
    packageName: string;
    remaining: number;
  };
};

export async function resolveConsumptionCoverage(
  db: CoverageDb,
  studentId: string,
  foodItemId: string,
  now = new Date()
): Promise<ConsumptionCoverageResult> {
  if (!studentId || !foodItemId) {
    throw new CoverageError("studentId y foodItemId son requeridos", 400, "MISSING_FIELDS");
  }

  const [student, foodItem] = await Promise.all([
    db.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        active: true,
        level: true,
        grade: true,
        parentId: true,
        allergies: true,
        restrictions: true,
        parent: { select: { name: true } },
      },
    }),
    db.foodItem.findUnique({
      where: { id: foodItemId },
      select: {
        id: true,
        name: true,
        available: true,
        categoryId: true,
        category: { select: { name: true } },
        prices: { select: { level: true, price: true } },
      },
    }),
  ]);

  if (!student || !student.active) {
    throw new CoverageError("El estudiante no existe o está inactivo", 404, "STUDENT_NOT_FOUND");
  }

  if (!foodItem || !foodItem.available) {
    throw new CoverageError("La comida no existe o no está disponible", 404, "FOOD_NOT_AVAILABLE");
  }

  const unitPrice = resolveUnitPrice(foodItem.prices, student.level);
  if (unitPrice === null) {
    throw new CoverageError(
      "No hay precio configurado para esta comida",
      400,
      "MISSING_PRICE"
    );
  }

  const { start, end } = getDayBounds(now);

  const orderItem = await db.orderItem.findFirst({
    where: {
      studentId,
      foodItemId,
      delivered: false,
      scheduledDate: { gte: start, lte: end },
      order: { status: { in: [...ORDER_STATUSES_FOR_COVERAGE] } },
    },
    orderBy: { scheduledDate: "asc" },
    select: {
      id: true,
      quantity: true,
      scheduledDate: true,
      order: { select: { id: true, status: true } },
    },
  });

  if (orderItem) {
    return {
      coverageType: "ORDER",
      unitPrice,
      message: "La comida está cubierta por un pedido del día.",
      student: {
        id: student.id,
        name: student.name,
        level: student.level,
        grade: student.grade,
        parentId: student.parentId,
        parentName: student.parent.name,
        allergies: student.allergies,
        restrictions: student.restrictions,
      },
      foodItem: {
        id: foodItem.id,
        name: foodItem.name,
        categoryId: foodItem.categoryId,
        categoryName: foodItem.category.name,
      },
      orderItem: {
        id: orderItem.id,
        orderId: orderItem.order.id,
        quantity: orderItem.quantity,
        scheduledDate: orderItem.scheduledDate,
        orderStatus: orderItem.order.status,
      },
    };
  }

  const studentPackage = await db.studentPackage.findFirst({
    where: {
      studentId,
      status: "ACTIVE",
      remaining: { gt: 0 },
      startDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: now } }],
      package: {
        packageItems: {
          some: {
            categoryId: foodItem.categoryId,
          },
        },
      },
    },
    include: {
      package: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (studentPackage) {
    return {
      coverageType: "PACKAGE",
      unitPrice,
      message: `La comida está cubierta por el paquete ${studentPackage.package.name}.`,
      student: {
        id: student.id,
        name: student.name,
        level: student.level,
        grade: student.grade,
        parentId: student.parentId,
        parentName: student.parent.name,
        allergies: student.allergies,
        restrictions: student.restrictions,
      },
      foodItem: {
        id: foodItem.id,
        name: foodItem.name,
        categoryId: foodItem.categoryId,
        categoryName: foodItem.category.name,
      },
      studentPackage: {
        id: studentPackage.id,
        packageName: studentPackage.package.name,
        remaining: studentPackage.remaining,
      },
    };
  }

  return {
    coverageType: "CHARGE",
    unitPrice,
    message: "Sin compra previa para hoy. Se cargará a por pagar del padre.",
    student: {
      id: student.id,
      name: student.name,
      level: student.level,
      grade: student.grade,
      parentId: student.parentId,
      parentName: student.parent.name,
      allergies: student.allergies,
      restrictions: student.restrictions,
    },
    foodItem: {
      id: foodItem.id,
      name: foodItem.name,
      categoryId: foodItem.categoryId,
      categoryName: foodItem.category.name,
    },
  };
}