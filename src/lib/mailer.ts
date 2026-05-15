import "server-only";

import nodemailer from "nodemailer";

const globalForMailer = globalThis as unknown as {
  transporter?: nodemailer.Transporter;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

function getTransporter() {
  if (globalForMailer.transporter) {
    return globalForMailer.transporter;
  }

  const host = requireEnv("SMTP_HOST");
  const port = Number(requireEnv("SMTP_PORT"));
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");
  const secure = port === 465;

  globalForMailer.transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return globalForMailer.transporter;
}

export async function sendOtpEmail(input: {
  to: string;
  code: string;
  expiresMinutes: number;
}) {
  const from = requireEnv("SMTP_FROM");
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to: input.to,
    subject: "Your IIT Ropar login OTP",
    text: `Your OTP is ${input.code}. It expires in ${input.expiresMinutes} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="margin: 0 0 12px;">One-Time Password</h2>
        <p style="margin: 0 0 12px;">Use this code to log in:</p>
        <div style="display: inline-block; padding: 10px 16px; border-radius: 8px; background: #f3f4f6; font-weight: 700; letter-spacing: 2px;">
          ${input.code}
        </div>
        <p style="margin: 16px 0 0;">This code expires in ${input.expiresMinutes} minutes.</p>
      </div>
    `,
  });
}
