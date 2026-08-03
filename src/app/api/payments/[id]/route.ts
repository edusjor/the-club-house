import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { recomputeParentBalance } from "@/lib/balance";
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
  const { status, comment, amount } = await req.json();

  if (status !== undefined && !PAYMENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado de pago inválido" }, { status: 400 });
  }

  if (amount !== undefined && (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0)) {
    return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  }

  if (status === undefined && comment === undefined && amount === undefined) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({
        where: { id },
        select: { id: true, parentId: true, orderId: true, amount: true, status: true, comment: true },
      });

      if (!existing) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      const nextStatus = status ?? existing.status;
      const nextAmount = amount ?? existing.amount;
      const nextComment = comment !== undefined ? comment || null : existing.comment;
      const wasApproved = existing.status === "APPROVED";
      const willBeApproved = nextStatus === "APPROVED";
      const nothingChanged =
        nextStatus === existing.status && nextAmount === existing.amount && nextComment === existing.comment;

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: nextStatus,
          amount: nextAmount,
          comment: comment !== undefined ? comment || null : undefined,
          approvedById: willBeApproved
            ? (session.user as { id?: string }).id
            : wasApproved
            ? null
            : undefined,
        },
        include: {
          parent: { select: { name: true, email: true } },
          order: { select: { id: true, total: true, status: true } },
          approvedBy: { select: { name: true } },
        },
      });

      // Handle balance payments (no orderId). Recomputed from source
      // (orders + packages still charged, minus approved balance payments)
      // rather than patched incrementally, so correcting an already-approved
      // payment's amount self-heals the balance instead of compounding a
      // stale pendingBalance floor-at-zero clamp from an earlier mistake.
      if (!nothingChanged && !updated.order?.id) {
        const existingBalance = await tx.parentBalance.findUnique({
          where: { parentId: updated.parentId },
        });

        if (existingBalance) {
          const recomputed = await recomputeParentBalance(tx, updated.parentId);
          await tx.parentBalance.update({
            where: { parentId: updated.parentId },
            data: recomputed,
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
        const nextOrderStatus =
          approvedAmount >= updated.order.total
            ? "PAID"
            : undeliveredUnits === 0
            ? "DELIVERED"
            : "PENDING";

        if (nextOrderStatus !== updated.order.status) {
          await tx.order.update({
            where: { id: updated.order.id },
            data: { status: nextOrderStatus },
          });
        }
      }

      if (!nothingChanged) {
        const becameApproved = !wasApproved && willBeApproved;
        const becameRejected = existing.status !== "REJECTED" && nextStatus === "REJECTED";
        const amountCorrected = wasApproved && willBeApproved && nextAmount !== existing.amount;

        const title = becameApproved
          ? "Pago aprobado"
          : becameRejected
          ? "Pago rechazado"
          : amountCorrected
          ? "Pago corregido"
          : "Pago actualizado";

        const message = becameApproved
          ? "Tu pago fue aprobado y aplicado a tu cuenta."
          : becameRejected
          ? `Tu pago fue rechazado${comment ? `: ${comment}` : "."}`
          : amountCorrected
          ? `Se corrigió el monto de tu pago aprobado a ${nextAmount} CRC.${comment ? ` Nota: ${comment}` : ""}`
          : comment
          ? `Tu pago fue actualizado. Nota: ${comment}`
          : "Tu pago fue actualizado.";

        await tx.notification.create({
          data: { userId: updated.parentId, title, message },
        });
      }

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
