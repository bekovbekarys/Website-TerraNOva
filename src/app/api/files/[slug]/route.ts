import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { readFile } from "@/lib/storage";
import { unavailablePdf } from "@/lib/pdf";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const preprint = await prisma.preprint.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      status: true,
      submittedById: true,
      fileStoredName: true,
      fileOriginalName: true,
      fileMime: true,
    },
  });

  if (!preprint) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Published files are public. Non-published files are visible only to the
  // submitting author or a moderator.
  if (preprint.status !== "PUBLISHED") {
    const user = await getCurrentUser();
    const allowed =
      user && (user.role === "ADMIN" || user.id === preprint.submittedById);
    if (!allowed) {
      return NextResponse.json({ error: "Not available." }, { status: 403 });
    }
  }

  const download = new URL(req.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  let data: Buffer;
  try {
    data = await readFile(preprint.fileStoredName);
  } catch {
    // Fall back to a placeholder so the viewer degrades gracefully if the
    // stored file is ever missing.
    const placeholder = new Uint8Array(unavailablePdf());
    return new NextResponse(placeholder, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="unavailable.pdf"`,
        "Content-Length": String(placeholder.length),
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  }

  // Count downloads for published preprints (fire and forget).
  if (preprint.status === "PUBLISHED") {
    prisma.preprint
      .update({
        where: { id: preprint.id },
        data: { downloads: { increment: 1 } },
      })
      .catch(() => {});
  }

  const safeName = preprint.fileOriginalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const body = new Uint8Array(data);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": preprint.fileMime || "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Content-Length": String(body.length),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
