import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
  }

  if (!currentPassword) {
    return NextResponse.json(
      { error: "Debes ingresar tu contraseña actual" },
      { status: 400 }
    );
  }

  const currentUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!currentUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const validPassword = await bcrypt.compare(currentPassword, currentUser.password);
  if (!validPassword) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser && existingUser.id !== userId) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { email },
    select: { email: true },
  });

  return NextResponse.json({ email: updatedUser.email });
}
