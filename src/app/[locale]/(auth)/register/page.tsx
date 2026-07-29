import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { localePath } from "@/i18n/config";
import { getDashboardPath } from "@/lib/dashboard-path";
import RegisterPageClient from "./RegisterPageClient";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    redirect(localePath(locale, getDashboardPath(role)));
  }

  return <RegisterPageClient />;
}
