import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packages = await prisma.package.findMany({
    include: { packageItems: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, description, level, price, validityDays, status, rules, items } = body;

  const pkg = await prisma.package.create({
    data: {
      name,
      description,
      level,
      price,
      validityDays,
      status: status ?? "ACTIVE",
      rules,
      packageItems: {
        create: (items ?? []).map((i: { categoryId: string; quantity: number }) => ({
          categoryId: i.categoryId,
          quantity: i.quantity,
        })),
      },
    },
    include: { packageItems: { include: { category: true } } },
  });

  return NextResponse.json(pkg, { status: 201 });
}
