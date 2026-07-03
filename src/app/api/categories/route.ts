import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.foodCategory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, color, icon } = await req.json();
  const cat = await prisma.foodCategory.create({ data: { name, description, color, icon } });
  return NextResponse.json(cat, { status: 201 });
}
