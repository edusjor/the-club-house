import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const images = await prisma.monthlyMenuImage.findMany({
    orderBy: { position: "asc" },
  });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "La imagen es requerida" }, { status: 400 });
  }

  const lastImage = await prisma.monthlyMenuImage.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const image = await prisma.monthlyMenuImage.create({
    data: { url, position: (lastImage?.position ?? -1) + 1 },
  });

  return NextResponse.json(image, { status: 201 });
}
