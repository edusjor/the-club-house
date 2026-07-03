import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  CoverageError,
  resolveConsumptionCoverage,
} from "@/lib/consumption-coverage";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId") ?? "";
  const foodItemId = req.nextUrl.searchParams.get("foodItemId") ?? "";

  try {
    const coverage = await resolveConsumptionCoverage(prisma, studentId, foodItemId);

    return NextResponse.json({
      ...coverage,
      alerts: {
        allergies: coverage.student.allergies,
        restrictions: coverage.student.restrictions,
      },
    });
  } catch (error) {
    if (error instanceof CoverageError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: "No se pudo validar cobertura de consumo" },
      { status: 500 }
    );
  }
}