import Link from "next/link";
import type { Metadata } from "next";
import { CentralAsiaMap } from "@/components/library/CentralAsiaMap";
import { PaperCard, OpenAccessIcon, PinIcon, QuoteIcon } from "@/components/library/PaperCard";
import {
  PLACES,
  THEMES,
  PLACE_BY_KEY,
  THEME_BY_KEY,
  countBy,
  filterPapers,
  formatAuthors,
  getLibrary,
  type LibraryQuery,
  type PlaceKey,
  type ThemeKey,
} from "@/lib/library";
import { truncate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Central Asia Library",
  description:
    "Hundreds of open-access research papers on the environment and Earth sciences of Central Asia: the Aral Sea, the Tien Shan and Pamir, the Caspian, and the steppes and deserts of Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan and Turkmenistan.",
};

const PAGE_SIZE = 24;

type SearchParams = {
  q?: string;
  place?: string;
  theme?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
};

const PLACE_BLURBS: Record<PlaceKey, string> = {
  kazakhstan: "Steppes, Balkhash, Caspian shores",
  uzbekistan: "Oases, cotton, the southern Aral",
  kyrgyzstan: "Tien Shan, Issyk-Kul, glaciers",
  tajikistan: "Pamir peaks, Vakhsh, Fedchenko",
  turkmenistan: "Karakum Desert, Kopet Dag",
  aral: "A shrinking sea and its rivers",
  caspian: "The world's largest lake",
  mountains: "The water towers of Asia",
  drylands: "Dust, drought and grasslands",
};

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const library = await getLibrary();

  if (!library || library.papers.length === 0) {
    return <LibraryUnavailable />;
  }

  const all = library.papers;
  const q = (searchParams.q ?? "").trim().slice(0, 120);
  const place = PLACES.some((p) => p.key === searchParams.place) ? (searchParams.place as PlaceKey) : undefined;
  const theme = THEMES.some((t) => t.key === searchParams.theme) ? (searchParams.theme as ThemeKey) : undefined;
  const from = parseYear(searchParams.from);
  const to = parseYear(searchParams.to);
  const sort: LibraryQuery["sort"] =
    searchParams.sort === "newest" || searchParams.sort === "oldest" ? searchParams.sort : "cited";

  const results = filterPapers(all, { q, place, theme, from, to, sort });
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1));
  const shown = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const isFiltered = Boolean(q || place || theme || from || to);

  const placeCounts = countBy(all, (p) => p.places);
  const themeCounts = countBy(all, (p) => p.themes);
  const totalCitations = all.reduce((sum, p) => sum + p.citations, 0);
  const years = all.map((p) => p.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const journals = new Set(all.map((p) => p.journal).filter(Boolean)).size;

  const featured = !isFiltered && page === 1 && sort === "cited" ? results[0] : null;
  const grid = featured ? shown.slice(1) : shown;

  const current = { q, place, theme, from, to, sort };
  const href = (patch: Partial<typeof current> & { page?: number }) => libraryHref({ ...current, page: undefined, ...patch });

  const stats = [
    { value: all.length.toLocaleString("en-US"), label: "Open-access papers" },
    { value: journals.toLocaleString("en-US"), label: "Journals" },
    { value: compact(totalCitations), label: "Citations between them" },
    { value: `${minYear}–${maxYear}`, label: "Years covered" },
  ];

  return (
    <>
      {/* ------------------------------------------------------------------ Hero */}
      <section className="relative overflow-hidden bg-[#06261b] text-white">
        <div
          className="absolute inset-0 opacity-60 [animation:drift_22s_ease-in-out_infinite]"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 12% 18%, rgba(84,173,127,0.45) 0, transparent 45%), radial-gradient(ellipse at 88% 30%, rgba(26,166,255,0.35) 0, transparent 42%), radial-gradient(ellipse at 50% 110%, rgba(220,184,135,0.30) 0, transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />

        <div className="container-page relative pb-10 pt-14 sm:pt-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-terra-100 ring-1 ring-inset ring-white/15 backdrop-blur">
                <OpenAccessIcon className="h-3.5 w-3.5" />
                Open-access library
              </span>
              <h1 className="mt-6 font-serif text-4xl font-bold leading-[1.04] text-white sm:text-5xl lg:text-[3.6rem]">
                The science of{" "}
                <span className="bg-gradient-to-r from-terra-200 via-[#fce7c3] to-ocean-300 bg-clip-text text-transparent">
                  Central Asia
                </span>
                , free to read.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-terra-50/85">
                {all.length.toLocaleString("en-US")} peer-reviewed, open-access papers on the land, water,
                ice and climate of Kazakhstan, Uzbekistan, Kyrgyzstan, Tajikistan and Turkmenistan, from the
                Caspian shore to the Pamir. Every one can be read in full, at no cost.
              </p>

              <form action="/library" method="get" className="mt-8 max-w-xl">
                <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-2xl shadow-black/30 ring-1 ring-white/20">
                  <svg className="ml-3 h-5 w-5 shrink-0 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    name="q"
                    placeholder="Try “glacier”, “Aral Sea dust” or “salinity”"
                    className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
                    aria-label="Search the library"
                  />
                  <button type="submit" className="btn shrink-0 rounded-xl bg-terra-600 px-5 text-white hover:bg-terra-700">
                    Search
                  </button>
                </div>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-terra-100/60">Popular:</span>
                {[
                  ["Aral Sea", "aral"],
                  ["Glaciers", "cryosphere"],
                  ["Dust storms", "dust"],
                  ["Water & rivers", "water"],
                ].map(([label, key]) => (
                  <Link
                    key={label}
                    href={
                      PLACES.some((p) => p.key === key)
                        ? `/library?place=${key}`
                        : THEMES.some((t) => t.key === key)
                          ? `/library?theme=${key}`
                          : `/library?q=${encodeURIComponent(key)}`
                    }
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-terra-50/90 transition hover:border-white/35 hover:bg-white/10"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-up [animation-delay:150ms]">
              <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-ocean-500/20 via-transparent to-terra-300/20 blur-2xl" />
              <CentralAsiaMap className="relative w-full drop-shadow-2xl" />
            </div>
          </div>

          {/* Stats */}
          <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-[#06261b]/60 px-4 py-5 text-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-serif text-2xl font-bold text-white sm:text-3xl">{s.value}</dd>
                <dd className="mt-1 text-xs text-terra-100/70 sm:text-sm">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="relative block h-10 w-full sm:h-16" aria-hidden="true">
          <path d="M0 90V58l120-18 140 22 160-34 150 30 170-26 160 24 150-30 170 28 120-16V90Z" fill="#fafaf9" />
        </svg>
      </section>

      {/* ------------------------------------------------------------- Places */}
      {!isFiltered && page === 1 && (
        <section className="container-page pt-6">
          <SectionHeading eyebrow="Explore by place" title="Five countries, one shared landscape" />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {PLACES.filter((p) => p.kind === "country").map((p, i) => (
              <PlaceTile key={p.key} placeKey={p.key} count={placeCounts.get(p.key) ?? 0} index={i} />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {PLACES.filter((p) => p.kind === "landscape").map((p, i) => (
              <PlaceTile key={p.key} placeKey={p.key} count={placeCounts.get(p.key) ?? 0} index={i + 5} landscape />
            ))}
          </div>
        </section>
      )}

      {/* --------------------------------------------------------- Themes + filters */}
      <section id="papers" className="container-page scroll-mt-20 pt-12">
        {!isFiltered && page === 1 && <SectionHeading eyebrow="Explore by theme" title="What the research covers" />}

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={href({ theme: undefined }) + "#papers"}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              !theme ? "bg-stone-900 text-white shadow" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
            }`}
          >
            All themes
          </Link>
          {THEMES.map((t) => {
            const active = theme === t.key;
            return (
              <Link
                key={t.key}
                href={href({ theme: active ? undefined : t.key }) + "#papers"}
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active ? `ring-2 ring-inset ${t.chip} shadow-sm` : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-300"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                {t.label}
                <span className="text-xs tabular-nums text-stone-400">{themeCounts.get(t.key) ?? 0}</span>
              </Link>
            );
          })}
        </div>

        {/* Filter bar */}
        <form
          action="/library#papers"
          method="get"
          className="mt-6 grid gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-soft sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_0.6fr_0.6fr_0.9fr_auto]"
        >
          {theme && <input type="hidden" name="theme" value={theme} />}
          <input type="search" name="q" defaultValue={q} placeholder="Search title, abstract, author, journal…" className="input" aria-label="Search" />
          <select name="place" defaultValue={place ?? ""} className="input" aria-label="Place">
            <option value="">All places</option>
            <optgroup label="Countries">
              {PLACES.filter((p) => p.kind === "country").map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Landscapes">
              {PLACES.filter((p) => p.kind === "landscape").map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          </select>
          <input type="number" name="from" defaultValue={from ?? ""} min={minYear} max={maxYear} placeholder={`From ${minYear}`} className="input" aria-label="From year" />
          <input type="number" name="to" defaultValue={to ?? ""} min={minYear} max={maxYear} placeholder={`To ${maxYear}`} className="input" aria-label="To year" />
          <select name="sort" defaultValue={sort} className="input" aria-label="Sort">
            <option value="cited">Most cited</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <button type="submit" className="btn-primary">
            Apply
          </button>
        </form>

        {/* Result summary + active filters */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-stone-600">
          <span>
            <strong className="font-semibold text-stone-900">{results.length.toLocaleString("en-US")}</strong>{" "}
            {results.length === 1 ? "paper" : "papers"}
            {sort === "cited" ? ", most cited first" : sort === "newest" ? ", newest first" : ", oldest first"}
          </span>
          {q && <FilterPill label={`“${q}”`} href={href({ q: "" }) + "#papers"} />}
          {place && <FilterPill label={PLACE_BY_KEY[place].label} href={href({ place: undefined }) + "#papers"} />}
          {theme && <FilterPill label={THEME_BY_KEY[theme].label} href={href({ theme: undefined }) + "#papers"} />}
          {from && <FilterPill label={`From ${from}`} href={href({ from: undefined }) + "#papers"} />}
          {to && <FilterPill label={`To ${to}`} href={href({ to: undefined }) + "#papers"} />}
          {isFiltered && (
            <Link href="/library#papers" className="ml-1 font-semibold text-terra-700 hover:text-terra-800">
              Clear all
            </Link>
          )}
        </div>

        {/* Featured paper */}
        {featured && (
          <Link
            href={`/library/${featured.id}`}
            className="group relative mt-6 block overflow-hidden rounded-3xl bg-gradient-to-br from-terra-800 via-terra-900 to-[#06261b] p-7 text-white shadow-xl transition hover:shadow-2xl sm:p-10"
          >
            <div
              className="absolute inset-0 opacity-40 transition duration-700 group-hover:opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 90% 10%, rgba(26,166,255,0.5) 0, transparent 40%), radial-gradient(circle at 0% 100%, rgba(220,184,135,0.35) 0, transparent 45%)",
              }}
            />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#fce7c3]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#fce7c3] ring-1 ring-inset ring-[#fce7c3]/25">
                  ★ Most cited in the library
                </span>
                <h2 className="mt-4 max-w-3xl font-serif text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 text-sm font-medium text-terra-100/80">
                  {formatAuthors(featured, 4)} · {featured.journal ? <em>{featured.journal}</em> : null}
                  {featured.journal ? ", " : ""}
                  {featured.year}
                </p>
                {featured.abstract && (
                  <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-terra-50/80">{truncate(featured.abstract, 380)}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-6 lg:flex-col lg:items-end">
                <div className="text-left lg:text-right">
                  <p className="font-serif text-4xl font-bold">{featured.citations.toLocaleString("en-US")}</p>
                  <p className="text-xs uppercase tracking-wider text-terra-100/70">citations</p>
                </div>
                <span className="btn bg-white text-terra-900 transition group-hover:bg-terra-50">
                  Read the paper <span aria-hidden="true">→</span>
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Grid */}
        {results.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <p className="font-serif text-xl font-semibold text-stone-900">No papers match those filters.</p>
            <p className="mt-2 text-stone-600">Try a broader search, or clear a filter.</p>
            <Link href="/library#papers" className="btn-primary mt-6">
              Show all papers
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {grid.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} hrefFor={(n) => href({ page: n } as any) + "#papers"} />}
      </section>

      {/* -------------------------------------------------------------- About */}
      <section className="container-page pt-16">
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-gradient-to-br from-white to-terra-50/60 p-7 sm:p-10 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-bold">About this library</h2>
            <p className="mt-2 text-sm text-stone-600">
              Updated {new Date(library.fetchedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-stone-600 lg:col-span-2">
            <p>
              Papers are drawn from{" "}
              <a href="https://openalex.org" target="_blank" rel="noopener noreferrer" className="font-semibold text-terra-700 hover:underline">
                OpenAlex
              </a>
              , the open index of the world&apos;s research. We include journal articles in Earth and environmental science that are
              about Central Asia and are free to read, and refresh the collection every week.
            </p>
            <p>
              Each paper belongs to its authors and publisher. TerraNova shows the abstract and opens the publisher&apos;s
              open-access copy, so you always read the version of record or the author&apos;s accepted manuscript. Places and
              themes are tagged automatically from each paper&apos;s text, so a few may be imperfect.
            </p>
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <OpenAccessIcon className="h-4 w-4 text-terra-600" /> Free to read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <QuoteIcon className="h-4 w-4 text-terra-600" /> Citation counts from OpenAlex
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PinIcon className="h-4 w-4 text-terra-600" /> Tagged by place and theme
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------

function parseYear(v?: string) {
  const n = parseInt(v ?? "", 10);
  return n >= 1900 && n <= 2100 ? n : undefined;
}

function compact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function libraryHref(params: {
  q?: string;
  place?: string;
  theme?: string;
  from?: number;
  to?: number;
  sort?: string;
  page?: number;
}) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.place) sp.set("place", params.place);
  if (params.theme) sp.set("theme", params.theme);
  if (params.from) sp.set("from", String(params.from));
  if (params.to) sp.set("to", String(params.to));
  if (params.sort && params.sort !== "cited") sp.set("sort", params.sort);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/library${s ? `?${s}` : ""}`;
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terra-600">{eyebrow}</p>
      <h2 className="mt-1.5 text-2xl font-bold sm:text-3xl">{title}</h2>
    </div>
  );
}

const TILE_GRADIENTS = [
  "from-sky-500/15 to-cyan-400/5",
  "from-amber-500/15 to-orange-400/5",
  "from-emerald-500/15 to-teal-400/5",
  "from-indigo-500/15 to-violet-400/5",
  "from-orange-500/15 to-rose-400/5",
  "from-[#dcb887]/30 to-sky-300/10",
  "from-sky-600/15 to-indigo-400/5",
  "from-slate-400/20 to-sky-200/10",
  "from-amber-400/20 to-lime-300/5",
];

function PlaceTile({ placeKey, count, index, landscape }: { placeKey: PlaceKey; count: number; index: number; landscape?: boolean }) {
  const p = PLACE_BY_KEY[placeKey];
  return (
    <Link
      href={`/library?place=${placeKey}#papers`}
      className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-terra-200 hover:shadow-lg"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${TILE_GRADIENTS[index % TILE_GRADIENTS.length]} opacity-80 transition group-hover:opacity-100`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">{landscape ? "Landscape" : "Country"}</span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-stone-700 ring-1 ring-stone-200">{count}</span>
        </div>
        <p className="mt-5 font-serif text-lg font-bold text-stone-900 group-hover:text-terra-800">{p.label}</p>
        <p className="mt-0.5 text-xs text-stone-500">{PLACE_BLURBS[placeKey]}</p>
      </div>
    </Link>
  );
}

function FilterPill({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full bg-terra-50 px-3 py-1 text-xs font-semibold text-terra-800 ring-1 ring-inset ring-terra-200 transition hover:bg-terra-100"
      aria-label={`Remove filter ${label}`}
    >
      {label}
      <span aria-hidden="true" className="text-terra-500">
        ✕
      </span>
    </Link>
  );
}

function Pagination({ page, totalPages, hrefFor }: { page: number; totalPages: number; hrefFor: (n: number) => string }) {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) items.push("gap");
    items.push(n);
  });
  const base = "inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-semibold transition";
  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className={`${base} bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300`}>
          ← Prev
        </Link>
      )}
      {items.map((it, i) =>
        it === "gap" ? (
          <span key={`g${i}`} className="px-1 text-stone-400">
            …
          </span>
        ) : (
          <Link
            key={it}
            href={hrefFor(it)}
            aria-current={it === page ? "page" : undefined}
            className={`${base} ${it === page ? "bg-terra-700 text-white shadow" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300"}`}
          >
            {it}
          </Link>
        )
      )}
      {page < totalPages && (
        <Link href={hrefFor(page + 1)} className={`${base} bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-300`}>
          Next →
        </Link>
      )}
    </nav>
  );
}

function LibraryUnavailable() {
  return (
    <section className="relative overflow-hidden bg-[#06261b] text-white">
      <div className="container-page relative grid grid-cols-1 items-center gap-10 py-20 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-terra-100 ring-1 ring-inset ring-white/15">
            Central Asia library
          </span>
          <h1 className="mt-6 font-serif text-4xl font-bold leading-tight text-white sm:text-5xl">The library is being gathered.</h1>
          <p className="mt-4 max-w-lg text-lg text-terra-50/85">
            We&apos;re collecting open-access papers on Central Asia from OpenAlex. This usually takes a few seconds. Please
            refresh the page in a moment.
          </p>
          <a href="/library" className="btn mt-8 bg-white text-terra-900 hover:bg-terra-50">
            Refresh
          </a>
        </div>
        <CentralAsiaMap className="w-full opacity-90" />
      </div>
    </section>
  );
}
