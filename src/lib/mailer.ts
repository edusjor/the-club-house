import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error(
      "SMTP no está configurado. Define SMTP_HOST, SMTP_USER y SMTP_PASSWORD en el .env"
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendMail(options: Mail.Options) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transport = getTransporter();
  await transport.sendMail({ from, ...options });
}
