"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";

export async function credentialsLoginAction(locale: Locale, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(localePath(locale, "/login?error=CredentialsSignin"));
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: localePath(locale, "/post-login"),
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
