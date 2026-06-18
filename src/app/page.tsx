import Link from "next/link";
import { prisma } from "@/lib/db";
import { PreprintCard } from "@/components/PreprintCard";
import { SUBJECTS, SITE_TAGLINE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recent, total, subjectCounts] = await Promise.all([
    prisma.preprint.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 6,
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
    prisma.preprint.count({ where: { status: "PUBLISHED" } }),
    prisma.preprint.groupBy({
      by: ["subject"],
      where: { status: "PUBLISHED" },
      _count: { subject: true },
    }),
  ]);

  const countBySubject = new Map(
    subjectCounts.map((s) => [s.subject, s._count.subject])
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-terra-800 text-white">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #54ad7f 0, transparent 40%), radial-gradient(circle at 80% 20%, #1aa6ff 0, transparent 35%), radial-gradient(circle at 60% 90%, #8acca8 0, transparent 40%)",
          }}
        />
        <div className="container-page relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="badge bg-white/15 text-terra-50 ring-1 ring-inset ring-white/20">
              Free · Open access · Community-led
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Share your Earth science research, the moment it&apos;s ready.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-terra-50/90">
              {SITE_TAGLINE}. Post a preprint, reach readers worldwide, and
              establish priority for your work, with no fees and no paywalls.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/submit" className="btn bg-white text-terra-800 hover:bg-terra-50">
                Submit a preprint
              </Link>
              <Link
                href="/browse"
                className="btn border border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Browse {total > 0 ? `${total} ` : ""}preprints
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Search bar */}
      <section className="border-b border-stone-200 bg-white">
        <div className="container-page py-6">
          <form action="/browse" method="get" className="flex gap-2">
            <input
              type="search"
              name="q"
              placeholder="Search titles, authors, abstracts, keywords…"
              className="input"
              aria-label="Search preprints"
            />
            <button type="submit" className="btn-primary shrink-0">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Recent preprints */}
      <section className="container-page py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">Latest preprints</h2>
            <p className="mt-1 text-stone-600">
              Freshly posted research from the community.
            </p>
          </div>
          <Link
            href="/browse"
            className="hidden text-sm font-semibold text-terra-700 hover:text-terra-800 sm:block"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="card mt-6 p-10 text-center">
            <p className="text-lg font-semibold text-stone-900">
              No preprints published yet.
            </p>
            <p className="mt-1 text-stone-600">
              Be the first to share your research with the community.
            </p>
            <Link href="/submit" className="btn-primary mt-5">
              Submit the first preprint
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => (
              <PreprintCard key={p.slug} preprint={p} />
            ))}
          </div>
        )}
      </section>

      {/* Subjects */}
      <section className="border-t border-stone-200 bg-white py-14">
        <div className="container-page">
          <h2 className="text-2xl font-bold">Browse by subject</h2>
          <p className="mt-1 text-stone-600">
            Explore preprints across the Earth and environmental sciences.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SUBJECTS.map((subject) => (
              <Link
                key={subject}
                href={`/browse?subject=${encodeURIComponent(subject)}`}
                className="card flex items-center justify-between px-4 py-3 transition hover:border-terra-300 hover:shadow-md"
              >
                <span className="text-sm font-medium text-stone-700">
                  {subject}
                </span>
                <span className="badge bg-stone-100 text-stone-500">
                  {countBySubject.get(subject) ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <h2 className="text-center text-2xl font-bold">How TerraNova works</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Submit your manuscript",
              body: "Create an account and upload your PDF with a title, abstract, authors, and subject area. It takes a few minutes.",
            },
            {
              step: "2",
              title: "Quick moderation check",
              body: "A moderator screens each submission to confirm it is scholarly Earth-science work. This checks suitability, not scientific judgement.",
            },
            {
              step: "3",
              title: "Published & citable",
              body: "Once accepted, your preprint goes live with a permanent link, ready to be read, downloaded, and cited worldwide.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-terra-100 font-serif text-xl font-bold text-terra-700">
                {item.step}
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
