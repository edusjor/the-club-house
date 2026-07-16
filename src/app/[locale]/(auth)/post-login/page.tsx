import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function PostLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "ADMIN") redirect(`/${locale}/admin/dashboard`);
  if (role === "VENDOR") redirect(`/${locale}/vendor/dashboard`);
  if (role === "PARENT") redirect(`/${locale}/parent/dashboard`);

  if (!session?.user) redirect(`/${locale}/login?error=Session`);

  redirect(`/${locale}/unauthorized`);
}
