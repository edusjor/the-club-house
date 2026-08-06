import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { recomputeParentBalance } from "@/lib/balance";
import { NextRequest, NextResponse } from "next/server";

const ACTIONS = ["cancel", "reactivate"] as const;

// A parent can only self-cancel within 30 minutes of the purchase (an "oops"
// undo window) — regardless of whether the coverage start date has already
// arrived. Past that, only an admin can cancel or edit it. Mirrored
// client-side in parent/packages/page.tsx.
const PARENT_CANCEL_WINDOW_MS = 30 * 60 * 1000;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  if (role !== "ADMIN" && role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action } = await req.json();

  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  const studentPackage = await prisma.studentPackage.findUnique({
    where: { id },
    include: {
      student: { select: { name: true, parentId: true } },
      package: { select: { name: true } },
    },
  });

  if (!studentPackage) {
    return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
  }

  if (role === "PARENT") {
    if (studentPackage.student.parentId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action !== "cancel") {
      return NextResponse.json(
        { error: "Los padres solo pueden cancelar paquetes" },
        { status: 403 }
      );
    }

    if (studentPackage.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Este paquete ya no está activo" },
        { status: 400 }
      );
    }

    if (Date.now() - new Date(studentPackage.createdAt).getTime() > PARENT_CANCEL_WINDOW_MS) {
      return NextResponse.json(
        {
          error:
            "Ya pasaron los 30 minutos para cancelar esta compra. Solicita la cancelación a un administrador.",
        },
        { status: 400 }
      );
    }
  }

  if (role === "ADMIN") {
    if (action === "cancel" && studentPackage.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Este paquete ya no está activo" },
        { status: 400 }
      );
    }

    if (
      action === "reactivate" &&
      studentPackage.status !== "CANCELLED" &&
      studentPackage.status !== "CANCELLED_BY_ADMIN"
    ) {
      return NextResponse.json(
        { error: "Este paquete no está cancelado" },
        { status: 400 }
      );
    }
  }

  const nextStatus =
    action === "cancel"
      ? role === "ADMIN"
        ? "CANCELLED_BY_ADMIN"
        : "CANCELLED"
      : "ACTIVE";

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.studentPackage.update({
      where: { id },
      data: { status: nextStatus },
    });

    let balance = await tx.parentBalance.findUnique({
      where: { parentId: studentPackage.student.parentId },
    });

    if (!balance) {
      balance = await tx.parentBalance.create({
        data: { parentId: studentPackage.student.parentId, pendingBalance: 0, approvedBalance: 0 },
      });
    }

    // Recomputed from source rather than +/- pricePaid floored at 0, so
    // cancelling a package that was already covered by an overpayment
    // correctly becomes creditBalance instead of erasing the excess.
    const recomputed = await recomputeParentBalance(tx, studentPackage.student.parentId);
    await tx.parentBalance.update({
      where: { parentId: studentPackage.student.parentId },
      data: recomputed,
    });

    await tx.notification.create({
      data: {
        userId: studentPackage.student.parentId,
        title: action === "cancel" ? "Paquete cancelado" : "Paquete reactivado",
        message:
          action === "cancel"
            ? `${studentPackage.package.name} para ${studentPackage.student.name} fue cancelado${role === "ADMIN" ? " por un administrador" : ""}. Se descontaron ${studentPackage.pricePaid} CRC de tu saldo.`
            : `${studentPackage.package.name} para ${studentPackage.student.name} fue reactivado. Se agregaron ${studentPackage.pricePaid} CRC a tu saldo por pagar.`,
      },
    });

    return updated;
  });

  return NextResponse.json(result);
}
