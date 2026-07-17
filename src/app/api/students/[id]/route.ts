import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessionRole = (session.user as { role?: string }).role;
  const sessionUserId = (session.user as { id?: string }).id;

  if (!sessionUserId || (sessionRole !== "ADMIN" && sessionRole !== "PARENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const {
    name,
    email,
    phone,
    password,
    level,
    parentId,
    allergies,
    photo,
    active,
  } = body;
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";

  const existing = await prisma.student.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Estudiante no encontrado" }, { status: 404 });
  }

  if (sessionRole === "PARENT" && existing.parentId !== sessionUserId) {
    return NextResponse.json(
      { error: "No puedes editar estudiantes de otra cuenta" },
      { status: 403 }
    );
  }

  // Staff self-records mirror the staff user's own account (userId === parentId);
  // they are managed from the profile, not as a child.
  if (existing.userId === existing.parentId) {
    return NextResponse.json(
      { error: "Este perfil de staff se administra desde la cuenta del usuario" },
      { status: 403 }
    );
  }

  if (parentId) {
    if (sessionRole === "PARENT" && parentId !== existing.parentId) {
      return NextResponse.json(
        { error: "No puedes reasignar el padre del estudiante" },
        { status: 403 }
      );
    }

    const parent = await prisma.user.findUnique({ where: { id: parentId } });
    if (!parent || parent.role !== "PARENT") {
      return NextResponse.json({ error: "El padre seleccionado no es válido" }, { status: 400 });
    }
  }

  const effectiveParentId =
    sessionRole === "PARENT" ? existing.parentId : parentId ?? existing.parentId;

  const student = await prisma.$transaction(async (tx) => {
    const userUpdateData: Record<string, unknown> = {
      name,
      email: normalizedEmail || existing.user.email,
      phone: normalizedPhone || null,
      active,
    };

    if (password) {
      userUpdateData.password = await bcrypt.hash(password, 12);
    }

    const updatedUser = await tx.user.update({
      where: { id: existing.userId },
      data: userUpdateData,
    });

    return tx.student.update({
      where: { id },
      data: {
        name: updatedUser.name,
        level,
        parentId: effectiveParentId,
        allergies,
        photo,
        active,
      },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true, phone: true, active: true, role: true } },
      },
    });
  });

  return NextResponse.json(student);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.student.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
