import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let balance = await prisma.parentBalance.findUnique({
      where: { parentId: session.user.id },
    });

    if (!balance) {
      balance = await prisma.parentBalance.create({
        data: {
          parentId: session.user.id,
          pendingBalance: 0,
          approvedBalance: 0,
        },
      });
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error("Error fetching parent balance:", error);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user as any).role !== "PARENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, type } = body;

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (type !== "ADD_PENDING" && type !== "ADD_APPROVED") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    let balance = await prisma.parentBalance.findUnique({
      where: { parentId: session.user.id },
    });

    if (!balance) {
      balance = await prisma.parentBalance.create({
        data: {
          parentId: session.user.id,
          pendingBalance: 0,
          approvedBalance: 0,
        },
      });
    }

    if (type === "ADD_PENDING") {
      balance = await prisma.parentBalance.update({
        where: { parentId: session.user.id },
        data: {
          pendingBalance: balance.pendingBalance + amount,
        },
      });
    } else if (type === "ADD_APPROVED") {
      balance = await prisma.parentBalance.update({
        where: { parentId: session.user.id },
        data: {
          approvedBalance: balance.approvedBalance + amount,
          pendingBalance: Math.max(0, balance.pendingBalance - amount),
        },
      });
    }

    return NextResponse.json(balance);
  } catch (error) {
    console.error("Error updating parent balance:", error);
    return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
  }
}
