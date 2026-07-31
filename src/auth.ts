import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.active || user.role === "STUDENT") return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
        token.name = user.name;
      }

      // Admin impersonation is driven entirely through this "update" trigger
      // rather than a real sign-in, since there is no password for the
      // target account. The client only ever supplies an intent (which user
      // to view, or to stop); every check that actually matters — is the
      // caller currently an ADMIN, does the target exist and is it an
      // active PARENT — runs here, server-side, against the already-signed
      // token and a fresh DB lookup. Never trust the `session` payload
      // beyond it being a signal to re-validate.
      if (trigger === "update" && session) {
        const data = session as {
          impersonateUserId?: string;
          stopImpersonation?: boolean;
          setImpersonationWriteAllowed?: boolean;
        };

        if (data.impersonateUserId && token.role === "ADMIN" && !token.impersonating) {
          const target = await prisma.user.findUnique({
            where: { id: data.impersonateUserId },
          });
          if (target && target.active && target.role === "PARENT") {
            token.adminId = token.id;
            token.adminName = token.name;
            token.id = target.id;
            token.name = target.name;
            token.role = target.role;
            token.impersonating = true;
            token.impersonationWriteAllowed = false;
          }
        }

        if (data.stopImpersonation && token.impersonating && token.adminId) {
          token.id = token.adminId;
          token.name = token.adminName as string | null | undefined;
          token.role = "ADMIN";
          delete token.adminId;
          delete token.adminName;
          delete token.impersonating;
          delete token.impersonationWriteAllowed;
        }

        if (typeof data.setImpersonationWriteAllowed === "boolean" && token.impersonating) {
          token.impersonationWriteAllowed = data.setImpersonationWriteAllowed;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as {
          id?: string;
          role?: string;
          impersonating?: boolean;
          adminId?: string;
          adminName?: string;
          impersonationWriteAllowed?: boolean;
        };
        user.id = token.id as string;
        user.role = token.role as string;
        if (token.impersonating) {
          user.impersonating = true;
          user.adminId = token.adminId as string;
          user.adminName = token.adminName as string;
          user.impersonationWriteAllowed = Boolean(token.impersonationWriteAllowed);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
