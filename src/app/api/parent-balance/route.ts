import { NextResponse } from "next/server";
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
