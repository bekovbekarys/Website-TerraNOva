import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  affiliation: z.string().trim().max(160).optional().or(z.literal("")),
  orcid: z.string().trim().max(40).optional().or(z.literal("")),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters.")
    .optional()
    .or(z.literal("")),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
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
      { error: parsed.error.errors[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const { name, affiliation, orcid, newPassword } = parsed.data;
  const data: Record<string, unknown> = {
    name,
    affiliation: affiliation || null,
    orcid: orcid || null,
  };
  if (newPassword) {
    data.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ ok: true });
}
