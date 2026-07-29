import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const packages = await prisma.package.findMany({
    include: { packageItems: { include: { category: true } }, prices: true },
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
  const { name, description, validityDays, status, rules, items, prices } = body;

  const pkg = await prisma.package.create({
    data: {
      name,
      description,
      validityDays,
      status: status ?? "ACTIVE",
      rules,
      packageItems: {
        create: (items ?? []).map((i: { categoryId: string }) => ({
          categoryId: i.categoryId,
        })),
      },
      prices: {
        create: (prices ?? []).map((p: { level: string; price: number }) => ({
          level: p.level,
          price: p.price,
        })),
      },
    },
    include: { packageItems: { include: { category: true } }, prices: true },
  });

  return NextResponse.json(pkg, { status: 201 });
}
