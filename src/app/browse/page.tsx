import Link from "next/link";
import { prisma } from "@/lib/db";
import { PreprintCard } from "@/components/PreprintCard";
import { SUBJECTS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Browse preprints" };

const PAGE_SIZE = 12;

type SearchParams = {
  q?: string;
  subject?: string;
  sort?: string;
  page?: string;
};

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const q = (searchParams.q ?? "").trim();
  const subject = searchParams.subject ?? "";
  const sort = searchParams.sort === "oldest" ? "oldest" : "newest";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: any = { status: "PUBLISHED" };
  if (subject && SUBJECTS.includes(subject)) where.subject = subject;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { abstract: { contains: q } },
      { authors: { contains: q } },
      { keywords: { contains: q } },
    ];
  }

  const [total, preprints] = await Promise.all([
    prisma.preprint.count({ where }),
    prisma.preprint.findMany({
      where,
      orderBy: { publishedAt: sort === "oldest" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        slug: true,
        title: true,
        abstract: true,
        authors: true,
        subject: true,
        publishedAt: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (subject) params.set("subject", subject);
    if (sort !== "newest") params.set("sort", sort);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/browse${s ? `?${s}` : ""}`;
  }

  return (
    <div className="container-page py-12">
      <h1 className="text-3xl font-bold">Browse preprints</h1>
      <p className="mt-2 text-stone-600">
        {total} published {total === 1 ? "preprint" : "preprints"}
        {subject ? ` in ${subject}` : ""}
        {q ? ` matching “${q}”` : ""}.
      </p>

      {/* Filters */}
      <form
        action="/browse"
        method="get"
        className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search titles, authors, abstracts…"
          className="input sm:max-w-md"
        />
        <select name="subject" defaultValue={subject} className="input sm:max-w-xs">
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} className="input sm:max-w-[160px]">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button type="submit" className="btn-primary">
          Apply
        </button>
      </form>

      {/* Results */}
      {preprints.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-lg font-semibold text-stone-900">No preprints found.</p>
          <p className="mt-1 text-stone-600">
            Try a different search, or{" "}
            <Link href="/browse" className="font-semibold text-terra-700">
              clear your filters
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {preprints.map((p) => (
            <PreprintCard key={p.slug} preprint={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn-secondary">
              ← Previous
            </Link>
          )}
          <span className="px-3 text-sm text-stone-600">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={pageHref(page + 1)} className="btn-secondary">
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
