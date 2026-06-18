import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  id: z.string().min(1),
  action: z.enum(["publish", "reject", "unpublish"]),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { id, action, note } = parsed.data;
  const preprint = await prisma.preprint.findUnique({ where: { id } });
  if (!preprint) {
    return NextResponse.json({ error: "Preprint not found." }, { status: 404 });
  }

  const statusMap = {
    publish: "PUBLISHED",
    reject: "REJECTED",
    unpublish: "PENDING",
  } as const;

  await prisma.preprint.update({
    where: { id },
    data: {
      status: statusMap[action],
      moderationNote: note || null,
      moderatedById: user.id,
      publishedAt:
        action === "publish"
          ? preprint.publishedAt ?? new Date()
          : action === "reject"
            ? null
            : preprint.publishedAt,
    },
  });

  return NextResponse.json({ ok: true });
}
