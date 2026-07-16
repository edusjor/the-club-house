import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const PAYMENT_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status, comment } = await req.json();

  if (!status || !PAYMENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado de pago inválido" }, { status: 400 });
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id },
        select: { id: true, parentId: true, orderId: true, amount: true },
      });

      if (!existing) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status,
          comment: comment || undefined,
          approvedById:
            status === "APPROVED" ? (session.user as { id?: string }).id : undefined,
        },
        include: {
          parent: { select: { name: true, email: true } },
          order: { select: { id: true, total: true, status: true } },
          approvedBy: { select: { name: true } },
        },
      });

      // Handle balance payments (no orderId)
      if (!updated.order?.id && status === "APPROVED") {
        let balance = await tx.parentBalance.findUnique({
          where: { parentId: updated.parentId },
        });

        if (balance) {
          balance = await tx.parentBalance.update({
            where: { parentId: updated.parentId },
            data: {
              pendingBalance: Math.max(0, balance.pendingBalance - updated.amount),
              approvedBalance: balance.approvedBalance + updated.amount,
            },
          });
        }
      }

      // Handle order payments
      if (updated.order?.id) {
        const [approved, undeliveredItems] = await Promise.all([
          tx.payment.aggregate({
            where: { orderId: updated.order.id, status: "APPROVED" },
            _sum: { amount: true },
          }),
          tx.orderItem.aggregate({
            where: { orderId: updated.order.id, delivered: false },
            _sum: { quantity: true },
          }),
        ]);

        const approvedAmount = approved._sum.amount ?? 0;
        const undeliveredUnits = undeliveredItems._sum.quantity ?? 0;
        const nextStatus =
          approvedAmount >= updated.order.total
            ? "PAID"
            : undeliveredUnits === 0
            ? "DELIVERED"
            : "PENDING";

        if (nextStatus !== updated.order.status) {
          await tx.order.update({
            where: { id: updated.order.id },
            data: { status: nextStatus },
          });
        }
      }

      await tx.notification.create({
        data: {
          userId: updated.parentId,
          title: `Pago ${status === "APPROVED" ? "aprobado" : status === "REJECTED" ? "rechazado" : "actualizado"}`,
          message:
            status === "APPROVED"
              ? "Tu pago fue aprobado y aplicado a tu cuenta."
              : status === "REJECTED"
              ? `Tu pago fue rechazado${comment ? `: ${comment}` : "."}`
              : "Tu pago fue actualizado.",
        },
      });

      return updated;
    });

    return NextResponse.json(payment);
  } catch (error) {
    if (error instanceof Error && error.message === "PAYMENT_NOT_FOUND") {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el pago" }, { status: 500 });
  }
}
