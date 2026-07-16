"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/config";

export async function credentialsLoginAction(locale: Locale, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(`/${locale}/login?error=CredentialsSignin`);
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: `/${locale}/post-login`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        redirect(`/${locale}/login?error=CredentialsSignin`);
      }

      redirect(`/${locale}/login?error=Session`);
    }

    throw error;
  }
}
