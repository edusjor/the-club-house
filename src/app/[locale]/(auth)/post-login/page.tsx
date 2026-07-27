import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { localePath } from "@/i18n/config";

export default async function PostLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "ADMIN") redirect(localePath(locale, "/admin/dashboard"));
  if (role === "VENDOR") redirect(localePath(locale, "/vendor/dashboard"));
  if (role === "PARENT") redirect(localePath(locale, "/parent/dashboard"));

  if (!session?.user) redirect(localePath(locale, "/login?error=Session"));

  redirect(localePath(locale, "/unauthorized"));
}
