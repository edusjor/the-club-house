import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ role: null }, { status: 401 });
  }
  return NextResponse.json({
    role: (session.user as { role?: string }).role,
    id: (session.user as { id?: string }).id,
  });
}
