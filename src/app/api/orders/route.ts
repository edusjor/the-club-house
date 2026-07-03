import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type IncomingOrderItem = {
  studentId: string;
  foodItemId: string;
  scheduledDate: string;
  quantity?: number;
  priceLevel?: string;
};

const PARENT_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;

function parseDayParam(dayParam: string | null) {
  if (!dayParam || !/^\d{4}-\d{2}-\d{2}$/.test(dayParam)) {
    return new Date();
  }

  const [year, month, day] = dayParam.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start, end };
}

function resolveUnitPrice(
  prices: { level: string; price: number }[],
  fallbackLevel: string,
  selectedLevel?: string
) {
  if (selectedLevel) {
    const selected = prices.find((price) => price.level === selectedLevel);
    return selected ? selected.price : null;
  }

  const exactFallback = prices.find((price) => price.level === fallbackLevel);
  if (exactFallback) return exactFallback.price;

  if (prices.length === 0) return null;

  return [...prices].sort((a, b) => a.price - b.price)[0].price;
}

function parseScheduledDate(value: string) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsedDateOnly = new Date(`${value}T23:59:00`);
    return Number.isNaN(parsedDateOnly.getTime()) ? null : parsedDateOnly;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addParentCancellationMeta<
  T extends { status: string; items: { delivered: boolean; scheduledDate: Date }[] },
>(orders: T[]) {
  const nowMs = Date.now();

  return orders.map((order) => {
    const undeliveredItems = order.items.filter((item) => !item.delivered);
    const hasDeliveredItems = undeliveredItems.length !== order.items.length;

    if (
      order.status === "CANCELLED" ||
      undeliveredItems.length === 0 ||
      hasDeliveredItems
    ) {
      return {
        ...order,
        parentCanCancel: false,
        parentCancellationDeadline: null,
      };
    }

    const earliestScheduledDate = undeliveredItems
      .map((item) => new Date(item.scheduledDate))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const parentCancellationDeadline = new Date(
      earliestScheduledDate.getTime() - PARENT_CANCELLATION_WINDOW_MS
    );

    return {
      ...order,
      parentCanCancel: nowMs <= parentCancellationDeadline.getTime(),
      parentCancellationDeadline: parentCancellationDeadline.toISOString(),
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;
  const selectedDate = parseDayParam(req.nextUrl.searchParams.get("date"));
  const { start, end } = getDayBounds(selectedDate);

  const orders =
    role === "ADMIN"
      ? await prisma.order.findMany({
          include: {
            parent: { select: { name: true, email: true } },
            items: { include: { student: true, foodItem: { include: { category: true } } } },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "PARENT"
      ? await prisma.order.findMany({
          where: { parentId: userId },
          include: {
            parent: { select: { name: true, email: true } },
            items: { include: { student: true, foodItem: { include: { category: true } } } },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "VENDOR"
      ? await prisma.order.findMany({
          where: {
            status: { in: ["PAID", "PREPARING", "DELIVERED"] },
            items: {
              some: {
                scheduledDate: {
                  gte: start,
                  lte: end,
                },
              },
            },
          },
          include: {
            parent: { select: { name: true } },
            items: {
              where: {
                scheduledDate: {
                  gte: start,
                  lte: end,
                },
              },
              include: { student: true, foodItem: true },
              orderBy: { scheduledDate: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

  if (!orders) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (role === "PARENT") {
    return NextResponse.json(addParentCancellationMeta(orders));
  }

  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  if (role !== "PARENT" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const items = (body.items ?? []) as IncomingOrderItem[];
  const notes = body.notes;
  const parentId = role === "ADMIN" ? body.parentId : userId;

  if (!parentId) {
    return NextResponse.json({ error: "No se pudo determinar el padre del pedido" }, { status: 400 });
  }

  const parent = await prisma.user.findUnique({
    where: { id: parentId },
    select: { id: true, role: true },
  });

  if (!parent || parent.role !== "PARENT") {
    return NextResponse.json({ error: "Padre inválido para crear pedido" }, { status: 400 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Debes agregar al menos un ítem" }, { status: 400 });
  }

  const studentIds = [...new Set(items.map((item) => item.studentId).filter(Boolean))];
  const foodItemIds = [...new Set(items.map((item) => item.foodItemId).filter(Boolean))];

  const [students, foodItems] = await Promise.all([
    prisma.student.findMany({
      where: {
        id: { in: studentIds },
        parentId,
        active: true,
      },
      select: {
        id: true,
        level: true,
      },
    }),
    prisma.foodItem.findMany({
      where: {
        id: { in: foodItemIds },
        available: true,
      },
      select: {
        id: true,
        prices: {
          select: {
            level: true,
            price: true,
          },
        },
      },
    }),
  ]);

  if (students.length !== studentIds.length) {
    return NextResponse.json(
      { error: "Uno o más estudiantes no son válidos para este padre" },
      { status: 400 }
    );
  }

  if (foodItems.length !== foodItemIds.length) {
    return NextResponse.json(
      { error: "Uno o más productos no están disponibles" },
      { status: 400 }
    );
  }

  const studentById = new Map(students.map((student) => [student.id, student]));
  const foodById = new Map(foodItems.map((foodItem) => [foodItem.id, foodItem]));

  const normalizedItems: {
    studentId: string;
    foodItemId: string;
    scheduledDate: Date;
    quantity: number;
    price: number;
  }[] = [];

  let total = 0;
  const now = new Date();
  const minimumAllowedTimestamp = now.getTime() - 5 * 60 * 1000;

  for (const item of items) {
    const student = studentById.get(item.studentId);
    const foodItem = foodById.get(item.foodItemId);

    if (!student || !foodItem) {
      return NextResponse.json(
        { error: "El pedido contiene datos inválidos" },
        { status: 400 }
      );
    }

    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "La cantidad debe ser un entero entre 1 y 10" },
        { status: 400 }
      );
    }

    const scheduledDate = parseScheduledDate(item.scheduledDate);
    if (!scheduledDate) {
      return NextResponse.json(
        { error: "Fecha programada inválida" },
        { status: 400 }
      );
    }

    if (scheduledDate.getTime() < minimumAllowedTimestamp) {
      return NextResponse.json(
        { error: "No puedes programar pedidos para horas pasadas" },
        { status: 400 }
      );
    }

    const requestedLevel =
      typeof item.priceLevel === "string" && item.priceLevel.trim().length > 0
        ? item.priceLevel.trim()
        : undefined;

    const unitPrice = resolveUnitPrice(foodItem.prices, student.level, requestedLevel);
    if (unitPrice === null) {
      return NextResponse.json(
        {
          error: requestedLevel
            ? "La comida no tiene precio configurado para el nivel seleccionado"
            : "Una comida no tiene precio configurado para el nivel del estudiante",
        },
        { status: 400 }
      );
    }

    total += unitPrice * quantity;

    for (let index = 0; index < quantity; index += 1) {
      normalizedItems.push({
        studentId: item.studentId,
        foodItemId: item.foodItemId,
        scheduledDate,
        quantity: 1,
        price: unitPrice,
      });
    }
  }

  const order = await prisma.order.create({
    data: {
      parentId,
      total,
      notes,
      items: {
        create: normalizedItems,
      },
    },
    include: {
      parent: { select: { name: true, email: true } },
      items: {
        include: {
          student: true,
          foodItem: { include: { category: true } },
        },
      },
      payments: true,
    },
  });

  return NextResponse.json(order, { status: 201 });
}
