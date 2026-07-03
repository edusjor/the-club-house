import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user && (session.user as { role?: string }).role !== "ADMIN") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  if (pathname.startsWith("/parent")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      session.user &&
      (session.user as { role?: string }).role !== "PARENT" &&
      (session.user as { role?: string }).role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  if (pathname.startsWith("/vendor")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (
      session.user &&
      (session.user as { role?: string }).role !== "VENDOR" &&
      (session.user as { role?: string }).role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/parent/:path*", "/vendor/:path*"],
};