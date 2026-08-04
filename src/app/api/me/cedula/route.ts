import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const cedula = typeof body.cedula === "string" ? body.cedula.trim() : "";

  if (!cedula) {
    return NextResponse.json({ error: "Debes ingresar tu cédula" }, { status: 400 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { cedula },
    select: { cedula: true },
  });

  return NextResponse.json({ cedula: updatedUser.cedula });
}
