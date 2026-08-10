import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isDemoPreprint } from "@/lib/utils";
import { mintDoiForPreprint, zenodoConfigured } from "@/lib/zenodo";

const schema = z.object({ id: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!zenodoConfigured()) {
    return NextResponse.json(
      { error: "Zenodo is not configured. Set ZENODO_TOKEN in the environment." },
      { status: 400 }
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
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const preprint = await prisma.preprint.findUnique({
    where: { id: parsed.data.id },
    include: { submittedBy: { select: { email: true } } },
  });
  if (!preprint) {
    return NextResponse.json({ error: "Preprint not found." }, { status: 404 });
  }
  if (isDemoPreprint(preprint)) {
    return NextResponse.json(
      { error: "Cannot mint a DOI for a demonstration entry." },
      { status: 400 }
    );
  }
  if (preprint.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Publish the preprint on TerraNova before minting a DOI." },
      { status: 400 }
    );
  }
  if (preprint.doi) {
    return NextResponse.json(
      { error: "This preprint already has a DOI." },
      { status: 400 }
    );
  }

  try {
    const result = await mintDoiForPreprint(preprint);
    await prisma.preprint.update({
      where: { id: preprint.id },
      data: {
        doi: result.doi,
        zenodoRecordId: result.recordId,
        zenodoUrl: result.recordUrl,
        zenodoConceptDoi: result.conceptDoi,
      },
    });
    return NextResponse.json({ ok: true, doi: result.doi, url: result.recordUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DOI minting failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
