// Shared "is this package active/expiring/expired/not started yet" logic —
// used everywhere a StudentPackage purchase is shown (parent, admin, vendor)
// so the color/threshold stays consistent across the app. A package's DB
// `status` field only ever changes on cancel/reactivate — it never flips to
// "expired" on its own — so this derives the real-world state from the
// dates instead, and is only meaningful for status === "ACTIVE" rows.

export type PackageLifecycle = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "NOT_STARTED";

export const PACKAGE_EXPIRING_SOON_DAYS = 7;

export function classifyPackageLifecycle(
  pkg: { startDate: string | Date; endDate?: string | Date | null },
  now: Date = new Date()
): PackageLifecycle {
  const startTime = new Date(pkg.startDate).getTime();
  if (startTime > now.getTime()) return "NOT_STARTED";
  if (!pkg.endDate) return "ACTIVE";
  const endTime = new Date(pkg.endDate).getTime();
  if (endTime < now.getTime()) return "EXPIRED";
  const daysUntilExpiry = (endTime - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilExpiry <= PACKAGE_EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
  return "ACTIVE";
}

// Green/orange/red/gray — same palette everywhere this shows up.
export const PACKAGE_LIFECYCLE_BADGE_CLASSES: Record<PackageLifecycle, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  EXPIRING_SOON: "border-orange-200 bg-orange-50 text-orange-700",
  EXPIRED: "border-red-200 bg-red-50 text-red-700",
  NOT_STARTED: "border-slate-200 bg-slate-50 text-slate-600",
};

// Finds the soonest future purchase of the same package type for the same
// student — used to show "renewal scheduled for X" alongside an expired one.
export function findScheduledRenewal<
  T extends { id: string; studentId: string; packageId: string; startDate: string | Date; status: string }
>(pkg: T, all: T[], now: Date = new Date()): T | null {
  const candidates = all.filter(
    (candidate) =>
      candidate.id !== pkg.id &&
      candidate.studentId === pkg.studentId &&
      candidate.packageId === pkg.packageId &&
      candidate.status === "ACTIVE" &&
      new Date(candidate.startDate).getTime() > now.getTime()
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  return candidates[0];
}
