import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";
import { parseCostaRicaLocalDateTime } from "@/lib/coming-soon-date";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({
    comingSoonEnabled: settings.comingSoonEnabled,
    comingSoonAt: settings.comingSoonAt,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data: { comingSoonEnabled?: boolean; comingSoonAt?: Date | null } = {};

  if (typeof body.comingSoonEnabled === "boolean") {
    data.comingSoonEnabled = body.comingSoonEnabled;
  }
  if (body.comingSoonAt === null) {
    data.comingSoonAt = null;
  } else if (typeof body.comingSoonAt === "string" && body.comingSoonAt) {
    const parsed = parseCostaRicaLocalDateTime(body.comingSoonAt);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    data.comingSoonAt = parsed;
  }

  const settings = await updateSiteSettings(data);
  return NextResponse.json({
    comingSoonEnabled: settings.comingSoonEnabled,
    comingSoonAt: settings.comingSoonAt,
  });
}
