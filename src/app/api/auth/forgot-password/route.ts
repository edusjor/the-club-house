import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { generateResetToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset";
import { isLocale, defaultLocale, localePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { NextRequest, NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rawLocale = typeof body.locale === "string" ? body.locale : "";
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: "El email no es válido" },
      { status: 400 }
    );
  }

  const dictionary = await getDictionary(locale);
  const t = dictionary.auth.forgotPassword.emailTemplate;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user && user.active) {
    const { token, tokenHash } = generateResetToken();

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${req.nextUrl.origin}${localePath(locale, `/reset-password?token=${token}`)}`;

    try {
      await sendMail({
        to: user.email as string,
        subject: t.subject,
        html: `
          <p>${t.greeting.replace("{name}", user.name)}</p>
          <p>${t.body}</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>${t.expiry}</p>
          <p>${t.ignore}</p>
        `,
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
    }
  }

  return NextResponse.json({ ok: true });
}
