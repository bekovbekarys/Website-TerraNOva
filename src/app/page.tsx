import Link from "next/link";
import { prisma } from "@/lib/db";
import { PreprintCard } from "@/components/PreprintCard";
import { HeroArt } from "@/components/HeroArt";
import { AralSeaArt } from "@/components/AralSeaArt";
import { SubjectIcon } from "@/components/SubjectIcon";
import { SUBJECTS, SITE_TAGLINE, SUPPORT_FUND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [recent, total, subjectCounts, downloadAgg] = await Promise.all([
    prisma.preprint.findMany({
      where: { status: "PUBLISHED", isLatest: true },
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
    prisma.preprint.count({ where: { status: "PUBLISHED", isLatest: true } }),
    prisma.preprint.groupBy({
      by: ["subject"],
      where: { status: "PUBLISHED", isLatest: true },
      _count: { subject: true },
    }),
    prisma.preprint.aggregate({
      where: { status: "PUBLISHED", isLatest: true },
      _sum: { downloads: true },
    }),
  ]);

  const countBySubject = new Map(
    subjectCounts.map((s) => [s.subject, s._count.subject])
  );
  const activeSubjects = subjectCounts.length;
  const totalDownloads = downloadAgg._sum.downloads ?? 0;

  const stats = [
    { value: total.toLocaleString(), label: "Preprints published" },
    { value: activeSubjects.toLocaleString(), label: "Active subject areas" },
    { value: totalDownloads.toLocaleString(), label: "Total downloads" },
    { value: "Free", label: "Forever, for everyone" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-terra-900 via-terra-800 to-terra-950 text-white">
        {/* Drifting colour wash */}
        <div
          className="absolute inset-0 opacity-30 [animation:drift_18s_ease-in-out_infinite]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 28%, #54ad7f 0, transparent 42%), radial-gradient(circle at 82% 18%, #1aa6ff 0, transparent 38%), radial-gradient(circle at 65% 95%, #8acca8 0, transparent 45%)",
          }}
        />
        {/* Glowing wash behind the scene */}
        <div className="pointer-events-none absolute -right-24 top-1/2 hidden h-[34rem] w-[34rem] -translate-y-1/2 rounded-full bg-gradient-to-tr from-ocean-500/30 to-terra-300/20 blur-2xl lg:block" />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        <div className="container-page relative py-20 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <div className="max-w-2xl animate-fade-up">
            <span className="badge bg-white/10 text-terra-50 ring-1 ring-inset ring-white/20 backdrop-blur">
              Free · Open access · Community-led
            </span>
            <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              Share your Earth science research, the moment it&apos;s ready.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-terra-50/90">
              {SITE_TAGLINE}. Post a preprint, reach readers worldwide, and
              establish priority for your work, with no fees and no paywalls.
            </p>

            {/* Hero search */}
            <form
              action="/browse"
              method="get"
              className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
            >
              <input
                type="search"
                name="q"
                placeholder="Search titles, authors, abstracts, keywords…"
                className="input border-transparent bg-white/95 shadow-lg"
                aria-label="Search preprints"
              />
              <button
                type="submit"
                className="btn shrink-0 bg-white text-terra-800 hover:bg-terra-50"
              >
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/submit"
                className="btn bg-ocean-400 text-white shadow-lg shadow-ocean-900/30 hover:bg-ocean-300"
              >
                Submit a preprint
              </Link>
              <Link
                href="/browse"
                className="btn border border-white/25 bg-white/5 text-white backdrop-blur hover:bg-white/10"
              >
                Browse {total > 0 ? `${total} ` : ""}preprints →
              </Link>
            </div>
          </div>

            {/* Hero illustration */}
            <div className="relative hidden justify-center lg:flex">
              <HeroArt className="w-full max-w-[26rem] animate-fade-up drop-shadow-2xl" />
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t border-white/10 bg-black/10 backdrop-blur">
          <div className="container-page grid grid-cols-2 divide-x divide-white/10 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="px-2 py-5 text-center sm:py-6">
                <p className="font-serif text-2xl font-bold text-white sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-terra-100/80 sm:text-sm">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mountain-ridge transition into the page */}
        <div className="relative" aria-hidden="true">
          <svg
            viewBox="0 0 1440 130"
            preserveAspectRatio="none"
            className="block h-[54px] w-full sm:h-[88px]"
          >
            <path
              d="M0 130V86l160-26 170 30 175-44 180 40 165-34 170 36 150-26 140 30V130Z"
              fill="#f5f5f4"
            />
            <path
              d="M0 130V104l140-22 165 26 175-34 165 32 175-30 160 30 155-22 140 22V130Z"
              fill="#fafaf9"
            />
          </svg>
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
                className="group card flex items-center justify-between gap-2 px-4 py-3 transition hover:-translate-y-0.5 hover:border-terra-300 hover:shadow-md"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-terra-50 text-terra-600 transition group-hover:bg-terra-100 group-hover:text-terra-700">
                    <SubjectIcon subject={subject} className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-stone-700 group-hover:text-terra-800">
                    {subject}
                  </span>
                </span>
                <span className="badge bg-stone-100 text-stone-500 group-hover:bg-terra-100 group-hover:text-terra-700">
                  {countBySubject.get(subject) ?? 0}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Support a cause */}
      <section className="container-page py-14">
        <div className="relative overflow-hidden rounded-3xl border border-ocean-100 bg-gradient-to-br from-ocean-50 to-terra-50 px-6 py-10 sm:px-10 sm:py-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.6fr_1fr]">
            <div>
              <span className="badge bg-ocean-100 text-ocean-800">
                {SUPPORT_FUND.region}
              </span>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Support a real environmental cause
              </h2>
              <p className="mt-3 max-w-xl text-stone-600">
                The science we host studies the Earth, and here&apos;s a chance
                to help heal it. Back the{" "}
                <strong className="font-semibold text-stone-800">
                  {SUPPORT_FUND.name}
                </strong>{" "}
                ({SUPPORT_FUND.shortName}) in restoring one of the planet&apos;s
                most severe environmental disasters.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/support" className="btn-primary">
                  Learn how to help →
                </Link>
                <a
                  href={SUPPORT_FUND.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  Donate at ecifas.kz
                </a>
              </div>
            </div>
            <div className="hidden justify-self-end lg:block">
              <AralSeaArt className="w-44 drop-shadow-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-terra-700">
            Simple by design
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            How TerraNova works
          </h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Submit your manuscript",
              body: "Create an account and upload your PDF with a title, abstract, authors, and subject area. It takes a few minutes.",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              ),
            },
            {
              step: "2",
              title: "Quick moderation check",
              body: "A moderator screens each submission to confirm it is scholarly Earth-science work. This checks suitability, not scientific judgement.",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              ),
            },
            {
              step: "3",
              title: "Published & citable",
              body: "Once accepted, your preprint goes live with a permanent link, ready to be read, downloaded, and cited worldwide.",
              icon: (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0a8.96 8.96 0 0 0 3.5-.7M12 3a8.96 8.96 0 0 1 0 18M3.6 9h16.8M3.6 15h16.8"
                />
              ),
            },
          ].map((item) => (
            <div
              key={item.step}
              className="card relative p-6 transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="absolute right-5 top-4 font-serif text-5xl font-bold text-stone-100">
                {item.step}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-terra-100 text-terra-700">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.6}
                  stroke="currentColor"
                >
                  {item.icon}
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-terra-700 to-terra-900 px-6 py-14 text-center text-white sm:px-12">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                "radial-gradient(circle at 15% 20%, #54ad7f 0, transparent 40%), radial-gradient(circle at 85% 80%, #1aa6ff 0, transparent 40%)",
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-serif text-3xl font-bold text-white sm:text-4xl">
              Ready to share your research?
            </h2>
            <p className="mt-3 text-lg text-terra-50/90">
              Join the community and get your work in front of readers worldwide,
              free of charge.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/submit"
                className="btn bg-white text-terra-800 hover:bg-terra-50"
              >
                Submit a preprint
              </Link>
              <Link
                href="/guidelines"
                className="btn border border-white/25 bg-white/5 text-white hover:bg-white/10"
              >
                Read the guidelines
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
