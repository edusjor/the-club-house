import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const SINGLETON_ID = "singleton";

export async function GET() {
  const record = await prisma.monthlyMenuPdf.findUnique({ where: { id: SINGLETON_ID } });
  return NextResponse.json({ url: record?.url ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    await prisma.monthlyMenuPdf.deleteMany({ where: { id: SINGLETON_ID } });
    return NextResponse.json({ url: null });
  }

  const record = await prisma.monthlyMenuPdf.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, url },
    update: { url },
  });

  return NextResponse.json({ url: record.url });
}
