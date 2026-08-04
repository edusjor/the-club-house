import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";

  if (!currentPassword) {
    return NextResponse.json(
      { error: "Debes ingresar tu contraseña actual" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Las contraseñas no coinciden" }, { status: 400 });
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

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ ok: true });
}
