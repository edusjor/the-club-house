import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { chargeParentBalance } from "@/lib/balance";
import { normalizePriceLevel } from "@/lib/utils";
import { buildScheduledDateForMealPeriod, isMealPeriod, type MealPeriod } from "@/lib/meal-scheduling";
import { canRoleSeeVendorOnlyItems, getFoodVisibility } from "@/lib/food-visibility";
import { getFoodTab, isPackageEligibleFoodTab } from "@/lib/food-tabs";
import { NextRequest, NextResponse } from "next/server";

type IncomingOrderItem =
  | {
      studentId: string;
      foodItemId: string;
      scheduledDate: string;
      quantity?: number;
      priceLevel?: string;
      studentPackageId?: string;
    }
  | {
      studentId: string;
      foodItemId: string;
      mealPeriod: MealPeriod;
      quantity?: number;
      priceLevel?: string;
      studentPackageId?: string;
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
    const normalizedSelectedLevel = normalizePriceLevel(selectedLevel);
    const selected = prices.find(
      (price) => normalizePriceLevel(price.level) === normalizedSelectedLevel
    );
    return selected ? selected.price : null;
  }

  const normalizedFallbackLevel = normalizePriceLevel(fallbackLevel);
  const exactFallback = prices.find(
    (price) => normalizePriceLevel(price.level) === normalizedFallbackLevel
  );
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

  // "carriedOver" ignores the date picker entirely — it's for surfacing
  // orders that are still stuck PAID/PREPARING from before today regardless
  // of which day the vendor happens to be viewing, so a name search always
  // finds a student's forgotten order from a previous day.
  const isCarriedOverScope = role === "VENDOR" && req.nextUrl.searchParams.get("scope") === "carriedOver";
  const { start: todayStart } = getDayBounds(new Date());

  const orders =
    role === "ADMIN"
      ? await prisma.order.findMany({
          include: {
            parent: { select: { name: true, email: true } },
            createdBy: { select: { name: true, role: true } },
            items: {
              include: {
                student: true,
                foodItem: { include: { category: true } },
                coveredByStudentPackage: { include: { package: { select: { name: true } } } },
              },
            },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "PARENT"
      ? await prisma.order.findMany({
          where: { parentId: userId },
          include: {
            parent: { select: { name: true, email: true } },
            createdBy: { select: { name: true, role: true } },
            items: {
              include: {
                student: true,
                foodItem: { include: { category: true } },
                coveredByStudentPackage: { include: { package: { select: { name: true } } } },
              },
            },
            payments: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "VENDOR"
      ? await prisma.order.findMany({
          where: isCarriedOverScope
            ? {
                status: { in: ["PAID", "PREPARING"] },
                items: { some: { scheduledDate: { lt: todayStart } } },
              }
            : {
                status: { in: ["PAID", "PREPARING", "DELIVERED", "NOT_PICKED_UP"] },
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
            createdBy: { select: { name: true, role: true } },
            items: {
              where: isCarriedOverScope
                ? { scheduledDate: { lt: todayStart } }
                : {
                    scheduledDate: {
                      gte: start,
                      lte: end,
                    },
                  },
              include: {
                student: true,
                foodItem: true,
                coveredByStudentPackage: { include: { package: { select: { name: true } } } },
              },
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

  if (role !== "PARENT" && role !== "ADMIN" && role !== "VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const items = (body.items ?? []) as IncomingOrderItem[];
  const notes = body.notes;

  let parentId: string | undefined;

  if (role === "PARENT") {
    parentId = userId;
  } else if (role === "ADMIN") {
    parentId = body.parentId;
  } else {
    // VENDOR: a walk-in order is always placed for one specific student —
    // resolve the parent from that student instead of trusting the client.
    const studentId = items[0]?.studentId;
    const allSameStudent = studentId && items.every((item) => item.studentId === studentId);

    if (!allSameStudent) {
      return NextResponse.json(
        { error: "Un pedido de vendedor solo puede ser para un estudiante" },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { parentId: true, active: true },
    });

    if (!student || !student.active) {
      return NextResponse.json({ error: "Estudiante inválido" }, { status: 400 });
    }

    parentId = student.parentId;
  }

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
        name: true,
        categoryId: true,
        fixedMealPeriod: true,
        foodTab: true,
        visibility: true,
        category: { select: { name: true } },
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
    mealPeriod: MealPeriod | null;
    quantity: number;
    price: number;
    coveredByStudentPackageId: string | null;
    delivered: boolean;
  }[] = [];

  const now = new Date();
  const minimumAllowedTimestamp = now.getTime() - 5 * 60 * 1000;

  // A vendor walk-in order means the student is standing at the counter
  // right now — it's handed over immediately, with no separate "mark as
  // served" step like advance-ordered meals need.
  const isVendorWalkIn = role === "VENDOR";

  // Only the vendor walk-in flow can draw down a monthly package — a package
  // is redeemed live at the counter, never through an advance parent order.
  const allowPackageCoverage = role === "VENDOR";
  const requestedPackageIds = allowPackageCoverage
    ? [...new Set(items.map((item) => item.studentPackageId).filter((id): id is string => Boolean(id)))]
    : [];

  const { start: todayStart, end: todayEnd } = getDayBounds(now);

  const eligiblePackages =
    requestedPackageIds.length > 0
      ? await prisma.studentPackage.findMany({
          where: {
            id: { in: requestedPackageIds },
            status: "ACTIVE",
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
            // A package covers one meal per day — once it already has an
            // OrderItem today, it drops out of eligibility here too.
            coveredOrderItems: { none: { scheduledDate: { gte: todayStart, lte: todayEnd } } },
          },
          include: { package: { include: { packageItems: true } } },
        })
      : [];
  const eligiblePackageById = new Map(eligiblePackages.map((sp) => [sp.id, sp]));
  const claimedPackageIdsInRequest = new Set<string>();

  for (const item of items) {
    const student = studentById.get(item.studentId);
    const foodItem = foodById.get(item.foodItemId);

    if (!student || !foodItem) {
      return NextResponse.json(
        { error: "El pedido contiene datos inválidos" },
        { status: 400 }
      );
    }

    if (getFoodVisibility(foodItem) === "VENDOR_ONLY" && !canRoleSeeVendorOnlyItems(role)) {
      return NextResponse.json(
        { error: "Este producto solo puede ser pedido por el vendedor en persona" },
        { status: 403 }
      );
    }

    const quantity = Number(item.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "La cantidad debe ser un entero entre 1 y 10" },
        { status: 400 }
      );
    }

    let scheduledDate: Date;
    let mealPeriod: MealPeriod | null = null;

    if ("mealPeriod" in item) {
      // A dish-of-the-day food item's period is server-authoritative — the
      // client's mealPeriod is ignored whenever the food item itself has one
      // set, so a manipulated request can't relabel "Lunch of the Day" as
      // "Break", for example.
      const resolvedMealPeriod = isMealPeriod(foodItem.fixedMealPeriod)
        ? foodItem.fixedMealPeriod
        : item.mealPeriod;

      if (!isMealPeriod(resolvedMealPeriod)) {
        return NextResponse.json(
          { error: "Momento de comida inválido" },
          { status: 400 }
        );
      }

      // "Today" vs "tomorrow" is never trusted from the client — it's always
      // resolved server-side from the current Costa Rica clock time (today
      // before 4pm, tomorrow at/after 4pm), so a stale tab can't submit a
      // "today" order past the cutoff.
      mealPeriod = resolvedMealPeriod;
      scheduledDate = buildScheduledDateForMealPeriod(resolvedMealPeriod, now);
    } else {
      const parsed = parseScheduledDate(item.scheduledDate);
      if (!parsed) {
        return NextResponse.json(
          { error: "Fecha programada inválida" },
          { status: 400 }
        );
      }

      if (parsed.getTime() < minimumAllowedTimestamp) {
        return NextResponse.json(
          { error: "No puedes programar pedidos para horas pasadas" },
          { status: 400 }
        );
      }

      scheduledDate = parsed;
    }

    let unitPrice: number | null;
    let coveredByStudentPackageId: string | null = null;

    if (allowPackageCoverage && item.studentPackageId) {
      // A package covers exactly one serving — quantity>1 would hand out
      // extra free servings while `consumed` only increments once.
      if (quantity !== 1) {
        return NextResponse.json(
          { error: "Un paquete solo puede cubrir una unidad por plato" },
          { status: 400 }
        );
      }

      if (claimedPackageIdsInRequest.has(item.studentPackageId)) {
        return NextResponse.json(
          { error: "Ese paquete solo puede cubrir un plato por pedido" },
          { status: 400 }
        );
      }

      const studentPackage = eligiblePackageById.get(item.studentPackageId);
      const coversCategory =
        isPackageEligibleFoodTab(getFoodTab(foodItem)) &&
        studentPackage?.package.packageItems.some(
          (packageItem) => packageItem.categoryId === foodItem.categoryId
        );

      if (!studentPackage || studentPackage.studentId !== item.studentId || !coversCategory) {
        return NextResponse.json(
          { error: "Ese paquete ya no está disponible para este consumo hoy" },
          { status: 400 }
        );
      }

      claimedPackageIdsInRequest.add(item.studentPackageId);
      coveredByStudentPackageId = item.studentPackageId;
      unitPrice = 0;
    } else {
      const requestedLevel =
        typeof item.priceLevel === "string" && item.priceLevel.trim().length > 0
          ? item.priceLevel.trim()
          : undefined;

      unitPrice = resolveUnitPrice(foodItem.prices, student.level, requestedLevel);
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
    }

    for (let index = 0; index < quantity; index += 1) {
      normalizedItems.push({
        studentId: item.studentId,
        foodItemId: item.foodItemId,
        scheduledDate,
        mealPeriod,
        quantity: 1,
        price: unitPrice,
        coveredByStudentPackageId,
        delivered: isVendorWalkIn,
      });
    }
  }

  // Each order represents one student's items for one scheduled date/time,
  // not everything the parent happened to submit in one checkout.
  const groupsByKey = new Map<string, { studentId: string; scheduledDate: Date; items: typeof normalizedItems }>();

  for (const normalizedItem of normalizedItems) {
    const key = `${normalizedItem.studentId}|${normalizedItem.scheduledDate.getTime()}`;
    const group = groupsByKey.get(key);
    if (group) {
      group.items.push(normalizedItem);
    } else {
      groupsByKey.set(key, {
        studentId: normalizedItem.studentId,
        scheduledDate: normalizedItem.scheduledDate,
        items: [normalizedItem],
      });
    }
  }

  // Orders are charged to the parent's credit balance immediately on creation —
  // there is no separate "submit for payment" step. The parent pays down the
  // balance later from /parent/balance.

  let orders;
  try {
    orders = await prisma.$transaction(async (tx) => {
      await tx.parentBalance.upsert({
        where: { parentId },
        create: { parentId, pendingBalance: 0, approvedBalance: 0 },
        update: {},
      });

      // A parent can't order past their credit limit — this is the amount an
      // admin sets per parent (100,000 colones by default); it only goes back
      // up when the parent pays down pendingBalance or an admin raises it.
      const totalToCharge = [...groupsByKey.values()].reduce(
        (sum, group) => sum + group.items.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0),
        0
      );

      // Draws down any existing creditBalance first, then charges
      // pendingBalance for the rest. Credit limit enforcement is disabled for
      // now (product decision, 2026-08) — creditLimit still exists on
      // ParentBalance and is still shown in the admin UI, it's just not
      // checked here. Flip this back to true to re-enable it later.
      const charged = await chargeParentBalance(tx, parentId, totalToCharge, {
        enforceCreditLimit: false,
      });

      if (!charged) {
        throw new Error("CREDIT_LIMIT_EXCEEDED");
      }

      const createdOrders = [];
      for (const group of groupsByKey.values()) {
        const order = await tx.order.create({
          data: {
            parentId,
            // A vendor walk-in is handed to the student on the spot — it's
            // created already DELIVERED, with no separate "mark as served" step.
            status: isVendorWalkIn ? "DELIVERED" : "PAID",
            total: group.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
            notes,
            source: isVendorWalkIn ? "VENDOR" : "PARENT",
            createdById: role === "PARENT" ? null : userId,
            items: {
              create: group.items,
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
        createdOrders.push(order);
      }

      const usedPackageIds = [...claimedPackageIdsInRequest];
      for (const packageId of usedPackageIds) {
        await tx.studentPackage.update({
          where: { id: packageId },
          data: { consumed: { increment: 1 } },
        });
      }

      return createdOrders;
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CREDIT_LIMIT_EXCEEDED") {
      return NextResponse.json(
        {
          error:
            "El saldo pendiente supera el límite de crédito disponible. Pague el saldo pendiente para poder pedir de nuevo, o pídale a un administrador que aumente el límite.",
          code: "CREDIT_LIMIT_EXCEEDED",
        },
        { status: 400 }
      );
    }
    throw error;
  }

  return NextResponse.json(orders, { status: 201 });
}
