import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setSessionCookie } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limit = rateLimit(`login:${ip}`, 10, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Constant-ish time: always run a compare to avoid leaking which emails exist.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) {
    return NextResponse.json(
      { error: "Incorrect email or password." },
      { status: 401 }
    );
  }

  await setSessionCookie(user.id);
  return NextResponse.json({ ok: true, role: user.role });
}
