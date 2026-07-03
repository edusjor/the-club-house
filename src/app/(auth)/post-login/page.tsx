import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function PostLoginPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "ADMIN") redirect("/admin/dashboard");
  if (role === "VENDOR") redirect("/vendor/dashboard");
  if (role === "PARENT") redirect("/parent/dashboard");

  if (!session?.user) redirect("/login?error=Session");

  redirect("/unauthorized");
}
