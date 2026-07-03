import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parsePaymentReceipt } from "@/lib/payment-receipt";
import { NextRequest, NextResponse } from "next/server";

const MAX_RECEIPT_LENGTH = 6_000_000;

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  const payments =
    role === "ADMIN"
      ? await prisma.payment.findMany({
          include: {
            parent: { select: { name: true, email: true } },
            order: { select: { id: true, total: true } },
            approvedBy: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.payment.findMany({
          where: { parentId: userId },
          include: {
            order: { select: { id: true, total: true } },
          },
          orderBy: { createdAt: "desc" },
        });

  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  if (role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { orderId, amount, receipt } = body;

  const receiptValue = typeof receipt === "string" ? receipt.trim() : "";

  if (!receiptValue) {
    return NextResponse.json(
      { error: "Debes subir comprobante o ingresar referencia SINPE" },
      { status: 400 }
    );
  }

  if (receiptValue.length > MAX_RECEIPT_LENGTH) {
    return NextResponse.json(
      { error: "El comprobante es demasiado grande" },
      { status: 400 }
    );
  }

  if (!parsePaymentReceipt(receiptValue)) {
    return NextResponse.json(
      { error: "Formato de comprobante inválido" },
      { status: 400 }
    );
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let normalizedAmount = Number(amount);
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    normalizedAmount = 0;
  }

  if (orderId) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, parentId: userId },
      select: { id: true, total: true },
    });

    if (!order) {
      return NextResponse.json({ error: "La orden no existe para este padre" }, { status: 404 });
    }

    const approved = await prisma.payment.aggregate({
      where: { orderId, status: "APPROVED" },
      _sum: { amount: true },
    });
    const approvedAmount = approved._sum.amount ?? 0;
    const outstanding = Math.max(0, order.total - approvedAmount);

    if (outstanding <= 0) {
      return NextResponse.json({ error: "La orden ya está pagada" }, { status: 400 });
    }

    if (normalizedAmount <= 0) {
      normalizedAmount = outstanding;
    }

    if (normalizedAmount > outstanding) {
      return NextResponse.json(
        { error: `El monto excede el pendiente (${outstanding})` },
        { status: 400 }
      );
    }
  } else if (normalizedAmount <= 0) {
    return NextResponse.json(
      { error: "Debes indicar un monto válido" },
      { status: 400 }
    );
  }

  const payment = await prisma.payment.create({
    data: {
      parentId: userId,
      orderId: orderId || undefined,
      amount: normalizedAmount,
      receipt: receiptValue,
      status: "PENDING",
    },
    include: {
      order: { select: { id: true, total: true } },
    },
  });

  await prisma.notification.create({
    data: {
      userId,
      title: "Pago enviado",
      message: `Se registró un pago por ${normalizedAmount} CRC en estado pendiente de revisión.`,
    },
  });

  return NextResponse.json(payment, { status: 201 });
}
