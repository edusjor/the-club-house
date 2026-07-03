import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  CoverageError,
  resolveConsumptionCoverage,
} from "@/lib/consumption-coverage";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  const userId = (session.user as { id?: string }).id;

  const consumptions =
    role === "ADMIN"
      ? await prisma.consumption.findMany({
          include: {
            student: { include: { parent: { select: { name: true, email: true } } } },
            foodItem: { include: { category: true } },
            studentPackage: { include: { package: true } },
            registeredBy: { select: { name: true } },
          },
          orderBy: { consumedAt: "desc" },
          take: 100,
        })
      : role === "PARENT"
      ? await prisma.consumption.findMany({
          where: { student: { parentId: userId } },
          include: {
            student: true,
            foodItem: { include: { category: true } },
            studentPackage: { include: { package: true } },
            registeredBy: { select: { name: true } },
          },
          orderBy: { consumedAt: "desc" },
          take: 100,
        })
      : await prisma.consumption.findMany({
          where: { consumedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
          include: {
            student: { include: { parent: { select: { name: true } } } },
            foodItem: true,
            registeredBy: { select: { name: true } },
          },
          orderBy: { consumedAt: "desc" },
          take: 100,
        });

  return NextResponse.json(consumptions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { studentId, foodItemId, notes } = body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const coverage = await resolveConsumptionCoverage(tx, studentId, foodItemId);

      const consumption = await tx.consumption.create({
        data: {
          studentId,
          foodItemId,
          studentPackageId:
            coverage.coverageType === "PACKAGE" ? coverage.studentPackage?.id : null,
          registeredById: userId,
          notes,
        },
        include: {
          student: { include: { parent: { select: { name: true, email: true } } } },
          foodItem: { include: { category: true } },
          studentPackage: { include: { package: true } },
          registeredBy: { select: { name: true } },
        },
      });

      let generatedOrderId: string | null = null;
      let generatedPaymentId: string | null = null;

      if (coverage.coverageType === "PACKAGE" && coverage.studentPackage) {
        const remaining = Math.max(0, coverage.studentPackage.remaining - 1);
        await tx.studentPackage.update({
          where: { id: coverage.studentPackage.id },
          data: {
            consumed: { increment: 1 },
            remaining,
            status: remaining === 0 ? "EXHAUSTED" : "ACTIVE",
          },
        });
      }

      if (coverage.coverageType === "ORDER" && coverage.orderItem) {
        if (coverage.orderItem.quantity > 1) {
          await tx.orderItem.update({
            where: { id: coverage.orderItem.id },
            data: {
              quantity: { decrement: 1 },
            },
          });
        } else {
          await tx.orderItem.update({
            where: { id: coverage.orderItem.id },
            data: { delivered: true },
          });
        }

        const [remainingUnits, order, approvedPayments] = await Promise.all([
          tx.orderItem.aggregate({
            where: {
              orderId: coverage.orderItem.orderId,
              delivered: false,
            },
            _sum: { quantity: true },
          }),
          tx.order.findUnique({
            where: { id: coverage.orderItem.orderId },
            select: { total: true, status: true },
          }),
          tx.payment.aggregate({
            where: {
              orderId: coverage.orderItem.orderId,
              status: "APPROVED",
            },
            _sum: { amount: true },
          }),
        ]);

        if (order) {
          const approvedAmount = approvedPayments._sum.amount ?? 0;
          const unitsLeft = remainingUnits._sum.quantity ?? 0;
          const nextStatus =
            unitsLeft === 0
              ? "DELIVERED"
              : approvedAmount >= order.total
              ? "PREPARING"
              : "PENDING";

          if (nextStatus !== order.status) {
            await tx.order.update({
              where: { id: coverage.orderItem.orderId },
              data: { status: nextStatus },
            });
          }
        }
      }

      if (coverage.coverageType === "CHARGE") {
        const generatedOrder = await tx.order.create({
          data: {
            parentId: coverage.student.parentId,
            total: coverage.unitPrice,
            status: "DELIVERED",
            notes: `Cargo automático por consumo de ${coverage.student.name}`,
            items: {
              create: {
                studentId,
                foodItemId,
                scheduledDate: new Date(),
                quantity: 1,
                price: coverage.unitPrice,
                delivered: true,
              },
            },
          },
          select: { id: true },
        });

        generatedOrderId = generatedOrder.id;

        const generatedPayment = await tx.payment.create({
          data: {
            parentId: coverage.student.parentId,
            orderId: generatedOrder.id,
            amount: coverage.unitPrice,
            status: "PENDING",
            comment: `Cargo automático por consumo no precomprado: ${coverage.foodItem.name}`,
          },
          select: { id: true },
        });

        generatedPaymentId = generatedPayment.id;

        await tx.notification.create({
          data: {
            userId: coverage.student.parentId,
            title: "Nuevo consumo pendiente de pago",
            message: `${coverage.student.name} consumió ${coverage.foodItem.name}. Se generó un cargo por ${coverage.unitPrice} CRC.`,
          },
        });
      }

      return {
        consumption,
        billing: {
          coverageType: coverage.coverageType,
          message: coverage.message,
          chargedAmount: coverage.coverageType === "CHARGE" ? coverage.unitPrice : 0,
          generatedOrderId,
          generatedPaymentId,
        },
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof CoverageError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "No se pudo registrar el consumo" },
      { status: 500 }
    );
  }
}