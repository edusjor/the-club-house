import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isStaff: true,
      phone: true,
      active: true,
      createdAt: true,
      parentStudents: {
        where: { user: { role: "STUDENT" } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          level: true,
          allergies: true,
          active: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              active: true,
            },
          },
        },
      },
      studentProfile: {
        select: {
          id: true,
          parentId: true,
          level: true,
          active: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, email, role, phone, active, password, isStaff } = body;
  const allowedRoles = ["ADMIN", "PARENT", "VENDOR", "STUDENT"];
  const normalizedEmail = typeof email === "string" ? email.trim() : undefined;
  const normalizedPhone = typeof phone === "string" ? phone.trim() : undefined;

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { studentProfile: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (role && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (existing.role === "STUDENT" && role && role !== "STUDENT") {
    return NextResponse.json(
      { error: "No puedes cambiar el rol de un estudiante desde esta pantalla" },
      { status: 400 }
    );
  }

  if (role === "STUDENT" && !existing.studentProfile) {
    return NextResponse.json(
      { error: "Primero crea el perfil de estudiante antes de asignar este rol" },
      { status: 400 }
    );
  }

  const resultingRole = role ?? existing.role;
  if (resultingRole !== "STUDENT") {
    if (!normalizedEmail || !normalizedPhone) {
      return NextResponse.json(
        { error: "Email y teléfono son obligatorios para este tipo de usuario" },
        { status: 400 }
      );
    }
  }

  const updateData: Record<string, unknown> = {
    name,
    role,
    active,
    isStaff: typeof isStaff === "boolean" ? isStaff : undefined,
    email: normalizedEmail,
    phone: normalizedPhone ? normalizedPhone : resultingRole === "STUDENT" ? null : normalizedPhone,
  };
  if (password) {
    updateData.password = await bcrypt.hash(password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, isStaff: true, phone: true, active: true, createdAt: true },
  });

  return NextResponse.json(user);
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
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
