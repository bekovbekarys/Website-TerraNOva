import { NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always returns a generic success so the endpoint never reveals which emails
// have accounts.
const GENERIC_OK = NextResponse.json({ ok: true });

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const captchaOk = await verifyTurnstile(body["cf-turnstile-response"], ip);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Captcha verification failed. Please try again." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const link = `${siteUrl()}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your TerraNova password",
      text: `Hi ${user.name},\n\nWe received a request to reset your TerraNova password. Open the link below to choose a new one. It expires in 1 hour.\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.`,
      html: emailLayout(
        "Reset your password",
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">Hi ${user.name}, we received a request to reset your TerraNova password.</p>
         <p style="margin:0 0 24px;font-size:14px;line-height:1.6">Click the button below to choose a new password. This link expires in 1 hour.</p>
         <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#2f7d54;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:bold">Reset password</a></p>
         <p style="margin:0;font-size:12px;color:#78716c;line-height:1.6">If you didn't request this, you can safely ignore this email. The link will expire on its own.</p>`
      ),
    });
  }

  return GENERIC_OK;
}
