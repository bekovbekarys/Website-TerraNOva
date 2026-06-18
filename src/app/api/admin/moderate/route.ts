import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { sendEmail, emailLayout, siteUrl } from "@/lib/email";

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
  const preprint = await prisma.preprint.findUnique({
    where: { id },
    include: { submittedBy: { select: { email: true, name: true } } },
  });
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

  // Notify the author of a publish/reject decision. Best-effort: never let an
  // email problem fail the moderation action.
  if (action === "publish" || action === "reject") {
    void notifyAuthor(action, preprint, note);
  }

  return NextResponse.json({ ok: true });
}

async function notifyAuthor(
  action: "publish" | "reject",
  preprint: {
    title: string;
    slug: string;
    submittedBy: { email: string; name: string };
  },
  note?: string
): Promise<void> {
  const { email, name } = preprint.submittedBy;

  if (action === "publish") {
    const link = `${siteUrl()}/preprint/${preprint.slug}`;
    await sendEmail({
      to: email,
      subject: `Your preprint is published: ${preprint.title}`,
      text: `Hi ${name},\n\nGood news: your preprint "${preprint.title}" has been published on TerraNova and is now publicly available:\n\n${link}\n\nThank you for sharing your work.`,
      html: emailLayout(
        "Your preprint is published",
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">Hi ${name}, good news: your preprint has been published on TerraNova and is now publicly available.</p>
         <p style="margin:0 0 24px;font-size:14px;line-height:1.6"><strong>${preprint.title}</strong></p>
         <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#2f7d54;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:bold">View your preprint</a></p>
         <p style="margin:0;font-size:12px;color:#78716c;line-height:1.6">Thank you for sharing your work.</p>`
      ),
    });
  } else {
    const noteHtml = note
      ? `<p style="margin:0 0 24px;font-size:14px;line-height:1.6;background:#f5f5f4;border-radius:8px;padding:12px 14px"><strong>Moderator note:</strong> ${note}</p>`
      : "";
    const noteText = note ? `\n\nModerator note: ${note}` : "";
    await sendEmail({
      to: email,
      subject: `An update on your submission: ${preprint.title}`,
      text: `Hi ${name},\n\nAfter review, your submission "${preprint.title}" was not published at this time.${noteText}\n\nYou're welcome to revise and resubmit. If you have questions, just reply to this email.`,
      html: emailLayout(
        "An update on your submission",
        `<p style="margin:0 0 16px;font-size:14px;line-height:1.6">Hi ${name}, after review, your submission was not published at this time.</p>
         <p style="margin:0 0 16px;font-size:14px;line-height:1.6"><strong>${preprint.title}</strong></p>
         ${noteHtml}
         <p style="margin:0;font-size:12px;color:#78716c;line-height:1.6">You're welcome to revise and resubmit.</p>`
      ),
    });
  }
}
