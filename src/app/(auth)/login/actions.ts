"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export async function credentialsLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=CredentialsSignin");
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/post-login",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        redirect("/login?error=CredentialsSignin");
      }

      redirect("/login?error=Session");
    }

    throw error;
  }
}
