import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { localePath } from "@/i18n/config";
import LoginPageClient from "./LoginPageClient";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user) redirect(localePath(locale, "/post-login"));

  return <LoginPageClient />;
}
