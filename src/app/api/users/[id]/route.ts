import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "VENDOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isStaff: true,
      phone: true,
      active: true,
      createdAt: true,
      parentStudents: {
        where: { user: { role: "STUDENT" } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          level: true,
          allergies: true,
          active: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              active: true,
            },
          },
          studentPackages: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              studentId: true,
              packageId: true,
              status: true,
              consumed: true,
              pricePaid: true,
              startDate: true,
              endDate: true,
              package: { select: { id: true, name: true, validityDays: true } },
            },
          },
        },
      },
      studentProfile: {
        select: {
          id: true,
          parentId: true,
          level: true,
          active: true,
        },
      },
      parentBalance: {
        select: {
          pendingBalance: true,
          approvedBalance: true,
          creditBalance: true,
          creditLimit: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          status: true,
          total: true,
          source: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              scheduledDate: true,
              student: { select: { name: true } },
              foodItem: { select: { name: true } },
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          amount: true,
          status: true,
          receipt: true,
          comment: true,
          createdAt: true,
          orderId: true,
          approvedBy: { select: { name: true, role: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(user);
}

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
  const { name, email, role, phone, active, password, isStaff } = body;
  const allowedRoles = ["ADMIN", "PARENT", "VENDOR", "STUDENT"];
  const normalizedEmail = typeof email === "string" ? email.trim() : undefined;
  const normalizedPhone = typeof phone === "string" ? phone.trim() : undefined;

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { studentProfile: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (role && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (existing.role === "STUDENT" && role && role !== "STUDENT") {
    return NextResponse.json(
      { error: "No puedes cambiar el rol de un estudiante desde esta pantalla" },
      { status: 400 }
    );
  }

  if (role === "STUDENT" && !existing.studentProfile) {
    return NextResponse.json(
      { error: "Primero crea el perfil de estudiante antes de asignar este rol" },
      { status: 400 }
    );
  }

  const resultingRole = role ?? existing.role;
  if (resultingRole !== "STUDENT") {
    if (!normalizedEmail || !normalizedPhone) {
      return NextResponse.json(
        { error: "Email y teléfono son obligatorios para este tipo de usuario" },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, unknown> = {
    name,
    role,
    active,
    isStaff: typeof isStaff === "boolean" ? isStaff : undefined,
    email: normalizedEmail,
    phone: normalizedPhone ? normalizedPhone : resultingRole === "STUDENT" ? null : normalizedPhone,
  };
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isStaff: true, phone: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
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

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, studentProfile: { select: { id: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // Permanent delete — for test accounts only, chosen deliberately by an
  // admin (gated above + confirmed in the UI). It wipes the user's own
  // history and, if they're a parent, their children's too: order items,
  // payments, orders, packages, notifications, logs, balance, student
  // profiles, and the linked student-login accounts. Deleted in FK-safe
  // order (RESTRICT relations first) — see the migration SQL for which
  // relations are RESTRICT vs SET NULL.
  //
  // Not touched: if this user is a vendor/admin who created orders or
  // approved payments for OTHER (real) parents, those records keep existing
  // but lose the "created/approved by" attribution (DB sets it to null) —
  // that's a deliberate DB-level SET NULL, not a bug, but worth knowing
  // before deleting a staff account that touched real transactions.
  await prisma.$transaction(async (tx) => {
    const ownedStudents = await tx.student.findMany({
      where: { parentId: id },
      select: { id: true, userId: true },
    });
    const studentIds = ownedStudents.map((student) => student.id);
    if (user.studentProfile) studentIds.push(user.studentProfile.id);

    const childUserIds = ownedStudents.map((student) => student.userId);
    const allUserIds = [id, ...childUserIds];

    await tx.orderItem.deleteMany({
      where: { OR: [{ order: { parentId: id } }, { studentId: { in: studentIds } }] },
    });
    await tx.payment.deleteMany({ where: { parentId: id } });
    await tx.order.deleteMany({ where: { parentId: id } });
    await tx.studentPackage.deleteMany({ where: { studentId: { in: studentIds } } });

    await tx.notification.deleteMany({ where: { userId: { in: allUserIds } } });
    await tx.activityLog.deleteMany({ where: { userId: { in: allUserIds } } });
    await tx.parentBalance.deleteMany({ where: { parentId: id } });

    if (ownedStudents.length > 0) {
      await tx.student.deleteMany({ where: { id: { in: ownedStudents.map((s) => s.id) } } });
      await tx.user.deleteMany({ where: { id: { in: childUserIds } } });
    }

    if (user.studentProfile) {
      await tx.student.delete({ where: { id: user.studentProfile.id } });
    }

    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
