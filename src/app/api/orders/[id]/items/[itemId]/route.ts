import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const PARENT_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  if (role !== "PARENT" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: orderId, itemId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        select: {
          id: true,
          price: true,
          quantity: true,
          delivered: true,
          scheduledDate: true,
        },
      },
      parent: { select: { name: true, email: true } },
      payments: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (role === "PARENT" && order.parentId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.status === "CANCELLED") {
    return NextResponse.json(
      { error: "No se puede modificar una orden cancelada" },
      { status: 400 }
    );
  }

  const orderItem = order.items.find((item) => item.id === itemId);
  if (!orderItem) {
    return NextResponse.json(
      { error: "El plato no existe en esta orden" },
      { status: 404 }
    );
  }

  if (orderItem.delivered) {
    return NextResponse.json(
      { error: "No se puede eliminar un plato ya entregado" },
      { status: 400 }
    );
  }

  if (role === "PARENT") {
    const cancellationDeadline =
      new Date(orderItem.scheduledDate).getTime() - PARENT_CANCELLATION_WINDOW_MS;

    if (Date.now() > cancellationDeadline) {
      return NextResponse.json(
        {
          error:
            "Solo puedes eliminar platos hasta 2 horas antes del horario programado.",
        },
        { status: 400 }
      );
    }
  }

  let updated;

  try {
    updated = await prisma.$transaction(async (tx) => {
      const deletedCount = await tx.orderItem.deleteMany({
        where: {
          id: itemId,
          orderId,
        },
      });

      if (deletedCount.count === 0) {
        throw new Error("ITEM_NOT_FOUND");
      }

      const remainingItems = await tx.orderItem.findMany({
        where: { orderId },
        include: {
          student: true,
          foodItem: { include: { category: true } },
        },
        orderBy: { scheduledDate: "asc" },
      });

      const nextTotal = remainingItems.reduce(
        (sum, item) => sum + item.price * (item.quantity > 0 ? item.quantity : 1),
        0
      );

      const orderStatus = remainingItems.length === 0 ? "CANCELLED" : order.status;

      return tx.order.update({
        where: { id: orderId },
        data: {
          total: nextTotal,
          status: orderStatus,
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
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json(
        { error: "El plato no existe en esta orden" },
        { status: 404 }
      );
    }

    throw error;
  }

  return NextResponse.json(updated);
}
