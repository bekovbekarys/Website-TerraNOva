import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { SUBJECTS, LICENSES, MAX_FILE_SIZE } from "@/lib/constants";

const metaSchema = z.object({
  title: z.string().trim().min(8, "Title must be at least 8 characters.").max(300),
  abstract: z
    .string()
    .trim()
    .min(40, "Abstract must be at least 40 characters.")
    .max(6000),
  authors: z
    .string()
    .trim()
    .min(2, "List at least one author.")
    .max(1000),
  subject: z.enum(SUBJECTS as [string, ...string[]], {
    errorMap: () => ({ message: "Choose a valid subject area." }),
  }),
  keywords: z.string().trim().max(400).optional().or(z.literal("")),
  license: z.enum(LICENSES as [string, ...string[]], {
    errorMap: () => ({ message: "Choose a valid license." }),
  }),
  comments: z.string().trim().max(500).optional().or(z.literal("")),
});

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "preprint";
  let slug = base;
  let n = 1;
  // Append a short suffix on collision.
  while (await prisma.preprint.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form submission." }, { status: 400 });
  }

  const parsed = metaSchema.safeParse({
    title: form.get("title"),
    abstract: form.get("abstract"),
    authors: form.get("authors"),
    subject: form.get("subject"),
    keywords: form.get("keywords") ?? "",
    license: form.get("license"),
    comments: form.get("comments") ?? "",
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Please attach your manuscript as a PDF." },
      { status: 400 }
    );
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Only PDF files are accepted." },
      { status: 400 }
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File is too large (max 30 MB)." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Basic content sniff: PDF files begin with "%PDF-".
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return NextResponse.json(
      { error: "The uploaded file does not appear to be a valid PDF." },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const slug = await uniqueSlug(data.title);
  const storedName = `${slug}-${Date.now()}.pdf`;

  await saveFile(storedName, buffer);

  const preprint = await prisma.preprint.create({
    data: {
      slug,
      title: data.title,
      abstract: data.abstract,
      authors: data.authors,
      subject: data.subject,
      keywords: data.keywords || null,
      license: data.license,
      comments: data.comments || null,
      fileOriginalName: file.name || `${slug}.pdf`,
      fileStoredName: storedName,
      fileMime: "application/pdf",
      fileSize: file.size,
      status: "PENDING",
      submittedById: user.id,
    },
  });

  return NextResponse.json({ ok: true, slug: preprint.slug });
}
