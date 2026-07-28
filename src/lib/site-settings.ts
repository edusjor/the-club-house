import { prisma } from "@/lib/db";

export async function isComingSoonEnabled(): Promise<boolean> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { comingSoonEnabled: true },
  });
  return settings?.comingSoonEnabled ?? false;
}

export async function getSiteSettings() {
  return prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function updateSiteSettings(data: {
  comingSoonEnabled?: boolean;
  comingSoonAt?: Date | null;
}) {
  return prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
}
