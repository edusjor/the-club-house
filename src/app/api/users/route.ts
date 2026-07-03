import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, role, phone, active, password } = body;
  const allowedRoles = ["ADMIN", "PARENT", "VENDOR", "STUDENT"];
  const normalizedRole = role ?? "PARENT";
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";

  if (!name || !password) {
    return NextResponse.json(
      { error: "Nombre y contraseña son requeridos" },
      { status: 400 }
    );
  }

  if (role && !allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (normalizedRole === "STUDENT") {
    return NextResponse.json(
      { error: "Los estudiantes deben crearse desde la sección Estudiantes/Hijos" },
      { status: 400 }
    );
  }

  if (!normalizedEmail || !normalizedPhone) {
    return NextResponse.json(
      { error: "Email y teléfono son obligatorios para este tipo de usuario" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "El email ya está registrado" },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      role: normalizedRole,
      phone: normalizedPhone,
      active: active ?? true,
      password: hashed,
    },
    select: { id: true, name: true, email: true, role: true, phone: true, active: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
