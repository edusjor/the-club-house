import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

function buildInternalStudentEmail() {
  return `student.${crypto.randomUUID()}@students.local`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id?: string }).id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, active: true },
  });

  if (!currentUser || !currentUser.active) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const role = currentUser.role;

  if (role === "ADMIN") {
    const students = await prisma.student.findMany({
      where: { user: { role: "STUDENT" } },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        user: { select: { id: true, name: true, email: true, phone: true, active: true, role: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(students);
  }

  if (role === "PARENT") {
    const students = await prisma.student.findMany({
      where: { parentId: userId, user: { role: "STUDENT" } },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, active: true, role: true } },
        studentPackages: {
          where: { status: "ACTIVE" },
          include: { package: true },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(students);
  }

  // VENDOR: active students
  const students = await prisma.student.findMany({
    where: { active: true, user: { role: "STUDENT" } },
    include: {
      parent: { select: { name: true, phone: true } },
      user: { select: { id: true, name: true, email: true, phone: true, active: true, role: true } },
      studentPackages: {
        where: { status: "ACTIVE" },
        include: { package: true },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionUserId = (session.user as { id?: string }).id;
  if (!sessionUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, role: true, active: true },
  });

  if (!currentUser || !currentUser.active) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const role = currentUser.role;
  if (role !== "ADMIN" && role !== "PARENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    userId: existingStudentUserId,
    name,
    email,
    phone,
    password,
    level,
    allergies,
    photo,
    parentId,
    active,
  } = body;

  const requestedParentId = typeof parentId === "string" ? parentId : "";
  const effectiveParentId = role === "PARENT" ? currentUser.id : requestedParentId;
  const normalizedEmail = typeof email === "string" ? email.trim() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!effectiveParentId || !level) {
    return NextResponse.json(
      { error: "Padre y nivel son requeridos" },
      { status: 400 }
    );
  }

  if (role === "PARENT" && existingStudentUserId) {
    return NextResponse.json(
      { error: "No puedes vincular usuarios existentes desde esta cuenta" },
      { status: 403 }
    );
  }

  const parent = await prisma.user.findUnique({ where: { id: effectiveParentId } });
  if (!parent || parent.role !== "PARENT") {
    return NextResponse.json(
      { error: "El padre seleccionado no es válido" },
      { status: 400 }
    );
  }

  try {
    if (existingStudentUserId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: existingStudentUserId },
        select: { id: true, name: true, role: true, active: true },
      });

      if (!existingUser || existingUser.role !== "STUDENT") {
        throw new Error("USER_NOT_STUDENT");
      }

      const existingProfile = await prisma.student.findUnique({
        where: { userId: existingStudentUserId },
      });
      if (existingProfile) {
        throw new Error("STUDENT_PROFILE_EXISTS");
      }

      const nextStudentName = name ?? existingUser.name;
      const updatedUser = await prisma.user.update({
        where: { id: existingStudentUserId },
        data: {
          name: nextStudentName,
          phone: normalizedPhone || null,
          active: active ?? existingUser.active,
          studentProfile: {
            create: {
              name: nextStudentName,
              level,
              allergies,
              photo,
              active: active ?? true,
              parentId: effectiveParentId,
            },
          },
        },
        include: {
          studentProfile: {
            include: {
              parent: { select: { id: true, name: true, email: true } },
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  active: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (!updatedUser.studentProfile) {
        throw new Error("STUDENT_CREATE_FAILED");
      }

      return NextResponse.json(updatedUser.studentProfile, { status: 201 });
    }

    if (!name) {
      throw new Error("MISSING_USER_FIELDS");
    }

    const finalEmail = normalizedEmail || buildInternalStudentEmail();
    const emailTaken = await prisma.user.findUnique({ where: { email: finalEmail } });
    if (emailTaken) {
      throw new Error("EMAIL_IN_USE");
    }

    const finalPassword = normalizedPassword || crypto.randomUUID();
    const hashed = await bcrypt.hash(finalPassword, 12);
    const createdUser = await prisma.user.create({
      data: {
        name,
        email: finalEmail,
        password: hashed,
        role: "STUDENT",
        phone: normalizedPhone || null,
        active: active ?? true,
        studentProfile: {
          create: {
            name,
            level,
            allergies,
            photo,
            active: active ?? true,
            parentId: effectiveParentId,
          },
        },
      },
      include: {
        studentProfile: {
          include: {
            parent: { select: { id: true, name: true, email: true } },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                active: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!createdUser.studentProfile) {
      throw new Error("STUDENT_CREATE_FAILED");
    }

    return NextResponse.json(createdUser.studentProfile, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message === "USER_NOT_STUDENT") {
      return NextResponse.json({ error: "El usuario seleccionado no es estudiante" }, { status: 400 });
    }
    if (message === "STUDENT_PROFILE_EXISTS") {
      return NextResponse.json({ error: "Ese usuario ya tiene perfil de estudiante" }, { status: 409 });
    }
    if (message === "MISSING_USER_FIELDS") {
      return NextResponse.json({ error: "El nombre del estudiante es requerido" }, { status: 400 });
    }
    if (message === "EMAIL_IN_USE") {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el estudiante" }, { status: 500 });
  }
}
