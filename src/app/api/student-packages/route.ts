import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function calculatePackageRemaining(items: { quantity: number }[]) {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  return total > 0 ? total : 1;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  const studentPackages =
    role === "ADMIN"
      ? await prisma.studentPackage.findMany({
          include: {
            student: true,
            package: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "PARENT"
      ? await prisma.studentPackage.findMany({
          where: { student: { parentId: userId } },
          include: {
            student: true,
            package: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : role === "VENDOR"
      ? await prisma.studentPackage.findMany({
          where: {
            status: "ACTIVE",
            remaining: { gt: 0 },
            student: { active: true },
          },
          include: {
            student: true,
            package: true,
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
      select: { id: true, name: true, parentId: true, active: true },
    }),
    prisma.package.findUnique({
      where: { id: packageId },
      include: {
        packageItems: {
          select: { quantity: true },
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

  const effectiveStartDate = startDate ? new Date(startDate) : new Date();
  if (Number.isNaN(effectiveStartDate.getTime())) {
    return NextResponse.json({ error: "startDate inválido" }, { status: 400 });
  }

  const remaining = calculatePackageRemaining(pkg.packageItems);
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
        remaining,
      },
      include: {
        student: true,
        package: true,
      },
    });

    const payment = await tx.payment.create({
      data: {
        parentId: student.parentId,
        amount: pkg.price,
        status: "PENDING",
        comment: `Compra de paquete ${pkg.name} para ${student.name}`,
      },
      select: { id: true, amount: true, status: true },
    });

    await tx.notification.create({
      data: {
        userId: student.parentId,
        title: "Paquete adquirido",
        message: `Se registró ${pkg.name} para ${student.name}. Pago pendiente por ${pkg.price} CRC.`,
      },
    });

    return { studentPackage, payment };
  });

  return NextResponse.json(result, { status: 201 });
}