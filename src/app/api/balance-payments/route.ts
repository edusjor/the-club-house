import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, receipt } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (!receipt) {
      return NextResponse.json({ error: "Receipt is required" }, { status: 400 });
    }

    // Get parent balance
    let balance = await prisma.parentBalance.findUnique({
      where: { parentId: session.user.id },
    });

    if (!balance) {
      return NextResponse.json({ error: "Balance not found" }, { status: 404 });
    }

    if (amount > balance.pendingBalance) {
      return NextResponse.json({ error: "Amount exceeds pending balance" }, { status: 400 });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        parentId: session.user.id,
        amount,
        receipt,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error("Error processing balance payment:", error);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
