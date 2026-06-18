import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie, isAdminEmail } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  affiliation: z.string().trim().max(160).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many sign-up attempts. Please try again later." },
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
      { error: parsed.error.errors[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { name, email, affiliation, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = isAdminEmail(email) ? "ADMIN" : "USER";

  const user = await prisma.user.create({
    data: {
      name,
      email,
      affiliation: affiliation || null,
      passwordHash,
      role,
    },
  });

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
