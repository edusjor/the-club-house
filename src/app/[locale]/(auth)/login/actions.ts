"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";
import { prisma } from "@/lib/db";
import { getDashboardPath } from "@/lib/dashboard-path";

export async function credentialsLoginAction(locale: Locale, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(localePath(locale, "/login?error=CredentialsSignin"));
  }

  // Resolve the destination up front so signIn's own redirect lands
  // straight on the right dashboard instead of bouncing through
  // /post-login — that extra client-side redirect hop was flaky in
  // dev (occasionally left users stranded on a blank /post-login shell).
  const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
  const dashboard = getDashboardPath(user?.role);

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: localePath(locale, dashboard),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        redirect(localePath(locale, "/login?error=CredentialsSignin"));
      }

      redirect(localePath(locale, "/login?error=Session"));
    }

    throw error;
  }
}
