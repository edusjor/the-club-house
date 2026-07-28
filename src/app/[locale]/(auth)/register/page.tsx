import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { localePath } from "@/i18n/config";
import RegisterPageClient from "./RegisterPageClient";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (session?.user) redirect(localePath(locale, "/post-login"));

  return <RegisterPageClient />;
}
