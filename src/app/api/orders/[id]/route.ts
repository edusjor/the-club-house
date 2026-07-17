import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatOrderNumber } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

const ORDER_STATUSES = ["PENDING", "PAID", "PREPARING", "DELIVERED", "NOT_PICKED_UP", "CANCELLED"] as const;
const VENDOR_ALLOWED_STATUSES = ["PREPARING", "DELIVERED", "NOT_PICKED_UP"] as const;
const PARENT_CANCELLATION_WINDOW_MS = 2 * 60 * 60 * 1000;

const STATUS_NOTIFICATION_MESSAGES: Record<string, string> = {
  PREPARING: "fue aceptado y está en preparación",
  DELIVERED: "fue entregado",
  NOT_PICKED_UP: "no fue recogido",
  CANCELLED: "fue cancelado",
};

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  const { id } = await params;
  const { status } = await req.json();

  if (!status || !ORDER_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { select: { id: true, delivered: true, scheduledDate: true } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (role === "PARENT") {
    if (order.parentId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (status !== "CANCELLED") {
      return NextResponse.json(
        { error: "Los padres solo pueden cancelar pedidos" },
        { status: 403 }
      );
    }

    if (order.items.some((item) => item.delivered)) {
      return NextResponse.json(
        { error: "No se puede cancelar un pedido con ítems entregados" },
        { status: 400 }
      );
    }

    const undeliveredItems = order.items.filter((item) => !item.delivered);
    if (undeliveredItems.length === 0) {
      return NextResponse.json(
        { error: "No hay ítems pendientes por cancelar" },
        { status: 400 }
      );
    }

    const earliestScheduledDate = undeliveredItems
      .map((item) => new Date(item.scheduledDate))
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const cancellationDeadline =
      earliestScheduledDate.getTime() - PARENT_CANCELLATION_WINDOW_MS;

    if (Date.now() > cancellationDeadline) {
      return NextResponse.json(
        {
          error:
            "Solo puedes cancelar hasta 2 horas antes del horario programado.",
        },
        { status: 400 }
      );
    }
  }

  if (role === "VENDOR" && !VENDOR_ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "El vendedor no puede aplicar ese estado" },
      { status: 403 }
    );
  }

  if ((status === "CANCELLED" || status === "NOT_PICKED_UP") && order.items.some((item) => item.delivered)) {
    return NextResponse.json(
      { error: "No se puede aplicar ese estado a un pedido con ítems entregados" },
      { status: 400 }
    );
  }

  if (order.status === "CANCELLED" || order.status === "NOT_PICKED_UP") {
    return NextResponse.json(
      { error: "No se puede cambiar un pedido cancelado o no recogido" },
      { status: 400 }
    );
  }

  if (role !== "ADMIN" && role !== "VENDOR" && role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    let nextStatus = status;

    if (status === "DELIVERED") {
      await tx.orderItem.updateMany({
        where: { orderId: id, delivered: false },
        data: { delivered: true },
      });

      nextStatus = "DELIVERED";
    }

    const result = await tx.order.update({
      where: { id },
      data: { status: nextStatus },
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

    // Orders are charged to the parent's balance as soon as they're created
    // (status leaves PENDING), so cancelling one has to refund that amount.
    if (nextStatus === "CANCELLED" && order.status !== "PENDING") {
      const balance = await tx.parentBalance.findUnique({
        where: { parentId: result.parentId },
      });

      if (balance) {
        await tx.parentBalance.update({
          where: { parentId: result.parentId },
          data: { pendingBalance: Math.max(0, balance.pendingBalance - order.total) },
        });
      }
    }

    const statusMessage =
      STATUS_NOTIFICATION_MESSAGES[result.status] ?? `cambió a estado ${result.status}`;

    await tx.notification.create({
      data: {
        userId: result.parentId,
        title: "Actualización de pedido",
        message: `Tu pedido #${formatOrderNumber(result.id)} ${statusMessage}.`,
      },
    });

    return result;
  });

  return NextResponse.json(updated);
}
