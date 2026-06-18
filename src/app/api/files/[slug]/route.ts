import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { readFile } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const preprint = await prisma.preprint.findUnique({
    where: { slug: params.slug },
    select: {
      id: true,
      status: true,
      isSample: true,
      submittedById: true,
      fileStoredName: true,
      fileOriginalName: true,
      fileMime: true,
    },
  });

  if (!preprint) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Sample/demonstration preprints carry placeholder files and are not
  // meant to be opened or downloaded.
  if (preprint.isSample) {
    return NextResponse.json(
      { error: "This is a demonstration preprint; its PDF is not available." },
      { status: 403 }
    );
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

  let data: Buffer;
  try {
    data = await readFile(preprint.fileStoredName);
  } catch {
    return NextResponse.json({ error: "File missing." }, { status: 404 });
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
  const download = new URL(req.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";
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
