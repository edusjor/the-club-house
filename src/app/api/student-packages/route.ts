import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { chargeParentBalance } from "@/lib/balance";
import { normalizePriceLevel } from "@/lib/utils";
import { getFoodTab, isPackageEligibleFoodTab } from "@/lib/food-tabs";
import {
  isBeforeEarliestSchoolDate,
  isWeekendDate,
  resolveEarliestSchoolDate,
} from "@/lib/meal-scheduling";
import { NextRequest, NextResponse } from "next/server";

function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setMilliseconds(end.getMilliseconds() - 1);

  return { start, end };
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  if (role === "VENDOR") {
    const studentPackages = await prisma.studentPackage.findMany({
      where: {
        status: "ACTIVE",
        student: { active: true },
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      include: {
        student: true,
        package: {
          include: {
            prices: true,
            packageItems: { include: { category: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (studentPackages.length === 0) {
      return NextResponse.json(studentPackages);
    }

    const { start, end } = getDayBounds();
    const usedTodayRows = await prisma.orderItem.findMany({
      where: {
        coveredByStudentPackageId: { in: studentPackages.map((sp) => sp.id) },
        scheduledDate: { gte: start, lte: end },
      },
      select: { coveredByStudentPackageId: true },
    });
    const usedTodayIds = new Set(usedTodayRows.map((row) => row.coveredByStudentPackageId));

    // A package's PackageItem is scoped to a whole FoodCategory (e.g.
    // "Lunch"), but that category also holds regular a-la-carte dishes sold
    // separately — the package only ever actually redeems the dish-of-the-day
    // (CASADOS tab) or a walk-up snack (SNACK tab) within it. Resolve the
    // real eligible item names here so the vendor UI shows what a package
    // truly covers instead of the whole (misleadingly broad) category name.
    const categoryIds = [
      ...new Set(studentPackages.flatMap((sp) => sp.package.packageItems.map((pi) => pi.categoryId))),
    ];
    const candidateFoodItems =
      categoryIds.length > 0
        ? await prisma.foodItem.findMany({
            where: { categoryId: { in: categoryIds }, available: true },
            select: { name: true, categoryId: true, foodTab: true, category: { select: { name: true } } },
          })
        : [];
    const eligibleNamesByCategory = new Map<string, string[]>();
    const snackCategoryIds = new Set<string>();
    for (const item of candidateFoodItems) {
      const foodTab = getFoodTab(item);
      if (!isPackageEligibleFoodTab(foodTab)) continue;
      if (foodTab === "SNACK") snackCategoryIds.add(item.categoryId);
      const names = eligibleNamesByCategory.get(item.categoryId) ?? [];
      names.push(item.name);
      eligibleNamesByCategory.set(item.categoryId, names);
    }

    return NextResponse.json(
      studentPackages.map((sp) => ({
        ...sp,
        usedToday: usedTodayIds.has(sp.id),
        package: {
          ...sp.package,
          // A snack package can be eligible for dozens of walk-up snack
          // items, so the vendor UI shows a generic "covers snacks" hint for
          // it instead of the full item list (which is still meaningful for
          // a lunch package, since that list is just the dish of the day).
          coversSnack: sp.package.packageItems.some((pi) => snackCategoryIds.has(pi.categoryId)),
          eligibleItemNames: [
            ...new Set(
              sp.package.packageItems.flatMap((pi) => eligibleNamesByCategory.get(pi.categoryId) ?? [])
            ),
          ],
        },
      }))
    );
  }

  const studentPackages =
    role === "ADMIN"
      ? await prisma.studentPackage.findMany({
          include: {
            student: {
              include: {
                parent: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
            package: { include: { prices: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "PARENT"
      ? await prisma.studentPackage.findMany({
          where: { student: { parentId: userId } },
          include: {
            student: true,
            package: { include: { prices: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

  if (!studentPackages) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(studentPackages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;
  if (role !== "PARENT" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, packageId, startDate } = body;

  if (!studentId || !packageId) {
    return NextResponse.json(
      { error: "studentId y packageId son requeridos" },
      { status: 400 }
    );
  }

  const [student, pkg] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, level: true, parentId: true, active: true },
    }),
    prisma.package.findUnique({
      where: { id: packageId },
      include: {
        prices: {
          select: { level: true, price: true },
        },
      },
    }),
  ]);

  if (!student || !student.active) {
    return NextResponse.json({ error: "Estudiante inválido o inactivo" }, { status: 400 });
  }

  if (role === "PARENT" && student.parentId !== userId) {
    return NextResponse.json(
      { error: "No puedes comprar paquetes para otros estudiantes" },
      { status: 403 }
    );
  }

  if (!pkg || pkg.status !== "ACTIVE") {
    return NextResponse.json({ error: "Paquete no disponible" }, { status: 400 });
  }

  const normalizedStudentLevel = normalizePriceLevel(student.level);
  const priceForLevel = pkg.prices.find(
    (p) => normalizePriceLevel(p.level) === normalizedStudentLevel
  );

  if (!priceForLevel || priceForLevel.price <= 0) {
    return NextResponse.json(
      { error: "Este paquete no está disponible para el nivel del estudiante" },
      { status: 400 }
    );
  }

  const packagePrice = priceForLevel.price;

  const effectiveStartDate = startDate ? new Date(startDate) : resolveEarliestSchoolDate();
  if (Number.isNaN(effectiveStartDate.getTime())) {
    return NextResponse.json({ error: "startDate inválido" }, { status: 400 });
  }

  // A package start date on a Saturday/Sunday is meaningless — the school
  // doesn't operate then — regardless of who's creating it or how far out
  // the date is, so this applies even to admin corrections.
  if (isWeekendDate(effectiveStartDate)) {
    return NextResponse.json(
      { error: "La fecha de inicio no puede ser sábado o domingo." },
      { status: 400 }
    );
  }

  // A parent can't backdate a package to a day that's already closed for
  // ordering (past cutoff) — same floor as regular orders. Admins can still
  // backdate for corrections.
  if (role === "PARENT" && isBeforeEarliestSchoolDate(effectiveStartDate)) {
    return NextResponse.json(
      { error: "La fecha de inicio no puede ser antes del próximo día disponible." },
      { status: 400 }
    );
  }

  const endDate =
    pkg.validityDays && pkg.validityDays > 0
      ? new Date(effectiveStartDate.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000)
      : null;

  const result = await prisma.$transaction(async (tx) => {
    const studentPackage = await tx.studentPackage.create({
      data: {
        studentId,
        packageId,
        startDate: effectiveStartDate,
        endDate,
        status: "ACTIVE",
        consumed: 0,
        pricePaid: packagePrice,
      },
      include: {
        student: true,
        package: { include: { prices: true } },
      },
    });

    // A package purchase is charged the same way an order is: it lands on
    // the parent's balance immediately (draining any creditBalance first),
    // and the parent settles whatever's left later from /parent/balance
    // (upload a receipt, admin approves it). There's no separate "payment
    // awaiting approval" record for the purchase itself — that would leave
    // the charge invisible on the balance the parent actually sees.
    await tx.parentBalance.upsert({
      where: { parentId: student.parentId },
      create: { parentId: student.parentId, pendingBalance: 0, approvedBalance: 0 },
      update: {},
    });
    await chargeParentBalance(tx, student.parentId, packagePrice, { enforceCreditLimit: false });

    await tx.notification.create({
      data: {
        userId: student.parentId,
        title: "Paquete adquirido",
        message: `Se registró ${pkg.name} para ${student.name}. Costo: ${packagePrice} CRC, aplicado a tu cuenta.`,
      },
    });

    return { studentPackage };
  });

  return NextResponse.json(result, { status: 201 });
}
