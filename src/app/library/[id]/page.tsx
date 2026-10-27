import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PaperCard, OpenAccessIcon, PinIcon, QuoteIcon } from "@/components/library/PaperCard";
import { CopyButton } from "@/components/library/CopyButton";
import { PLACE_BY_KEY, THEME_BY_KEY, getLibrary, relatedPapers, type LibraryPaper } from "@/lib/library";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const library = await getLibrary();
  const paper = library?.papers.find((p) => p.id === id) ?? null;
  return { library, paper };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { paper } = await load(params.id);
  if (!paper) return { title: "Paper" };
  return { title: paper.title, description: paper.abstract.slice(0, 200) || undefined };
}

function citation(p: LibraryPaper) {
  const names = p.authors.map((a) => a.name);
  const authors =
    names.length === 0 ? "" : p.authorCount > 3 ? `${names[0]} et al.` : names.join(", ").replace(/, ([^,]*)$/, " & $1");
  const parts = [`${authors}${authors ? " " : ""}(${p.year}). ${p.title}.`];
  if (p.journal) parts.push(` ${p.journal}.`);
  if (p.doi) parts.push(` https://doi.org/${p.doi}`);
  return parts.join("");
}

const OA_LABELS: Record<string, string> = {
  gold: "Gold: published open access",
  diamond: "Diamond: free to publish and read",
  hybrid: "Hybrid: open article in a subscription journal",
  green: "Green: free copy in a repository",
  bronze: "Bronze: free to read on the publisher site",
};

export default async function PaperPage({ params }: { params: { id: string } }) {
  const { library, paper } = await load(params.id);
  if (!library || !paper) notFound();

  const related = relatedPapers(library.papers, paper, 3);
  const mainTheme = paper.themes[0] ? THEME_BY_KEY[paper.themes[0]] : null;
  const readHref = paper.pdfUrl ? `/library/${paper.id}/read` : paper.landingUrl;
  const doiUrl = paper.doi ? `https://doi.org/${paper.doi}` : null;
  const shownAuthors = paper.authors.slice(0, 12);

  return (
    <>
      {/* Header */}
      <section className="relative overflow-hidden border-b border-stone-200 bg-gradient-to-b from-terra-50/80 via-white to-stone-50">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(circle at 85% 0%, rgba(26,166,255,0.12) 0, transparent 40%), radial-gradient(circle at 0% 0%, rgba(84,173,127,0.16) 0, transparent 40%)",
          }}
        />
        <div className="container-page relative max-w-5xl pb-10 pt-8">
          <nav className="flex flex-wrap items-center gap-1.5 text-sm text-stone-500">
            <Link href="/library" className="hover:text-terra-700">
              Central Asia Library
            </Link>
            {mainTheme && (
              <>
                <span className="text-stone-300">/</span>
                <Link href={`/library?theme=${mainTheme.key}#papers`} className="hover:text-terra-700">
                  {mainTheme.label}
                </Link>
              </>
            )}
          </nav>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-terra-600 px-3 py-1 text-xs font-semibold text-white">
              <OpenAccessIcon className="h-3.5 w-3.5" /> Open access
            </span>
            {paper.themes.map((t) => (
              <Link
                key={t}
                href={`/library?theme=${t}#papers`}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:shadow-sm ${THEME_BY_KEY[t].chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${THEME_BY_KEY[t].dot}`} />
                {THEME_BY_KEY[t].label}
              </Link>
            ))}
          </div>

          <h1 className="mt-5 max-w-4xl font-serif text-3xl font-bold leading-[1.15] text-stone-900 sm:text-4xl">{paper.title}</h1>

          <p className="mt-5 text-[15px] leading-relaxed text-stone-700">
            {shownAuthors.map((a, i) => (
              <span key={i}>
                <span className="font-semibold text-stone-800">{a.name}</span>
                {i < shownAuthors.length - 1 ? ", " : ""}
              </span>
            ))}
            {paper.authorCount > shownAuthors.length && <span className="text-stone-500"> and {paper.authorCount - shownAuthors.length} more</span>}
          </p>

          <p className="mt-2 text-sm text-stone-500">
            {paper.journal && <em className="text-stone-700">{paper.journal}</em>}
            {paper.journal && " · "}
            {paper.date
              ? new Date(paper.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
              : paper.year}
            {doiUrl && (
              <>
                {" · "}
                <a href={doiUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-terra-700 hover:underline">
                  doi:{paper.doi}
                </a>
              </>
            )}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            {readHref && (
              <a
                href={readHref}
                {...(paper.pdfUrl ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                className="btn bg-terra-600 px-5 py-3 text-white shadow-lg shadow-terra-900/15 hover:bg-terra-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5V5.5ZM12 6v13.5" />
                </svg>
                Read full paper
              </a>
            )}
            {paper.landingUrl && (
              <a href={paper.landingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary px-5 py-3">
                View at publisher ↗
              </a>
            )}
            {paper.pdfUrl && (
              <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary px-5 py-3">
                Download PDF ↓
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="container-page grid max-w-5xl gap-10 py-12 lg:grid-cols-[1fr_300px]">
        <article>
          <h2 className="text-xl font-bold">Abstract</h2>
          {paper.abstract ? (
            <p className="mt-4 text-[1.05rem] leading-[1.8] text-stone-700">
              {paper.abstract}
            </p>
          ) : (
            <p className="mt-4 rounded-xl bg-stone-100 px-4 py-3 text-stone-600">
              The publisher hasn&apos;t shared the abstract with the index. Open the full paper to read it.
            </p>
          )}

          {paper.keywords.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Keywords</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {paper.keywords.map((k) => (
                  <Link
                    key={k}
                    href={`/library?q=${encodeURIComponent(k)}#papers`}
                    className="rounded-full bg-white px-3 py-1 text-sm text-stone-700 ring-1 ring-stone-200 transition hover:text-terra-800 hover:ring-terra-300"
                  >
                    {k}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {paper.places.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Places studied</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {paper.places.map((pl) => (
                  <Link
                    key={pl}
                    href={`/library?place=${pl}#papers`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 transition hover:bg-terra-50 hover:text-terra-800"
                  >
                    <PinIcon className="h-3.5 w-3.5 text-terra-600" />
                    {PLACE_BY_KEY[pl].label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Cite this paper</h3>
              <CopyButton text={citation(paper)} label="Copy citation" />
            </div>
            <p className="mt-3 select-all font-serif text-[15px] leading-relaxed text-stone-700">{citation(paper)}</p>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-soft">
            <div className={`h-1.5 bg-gradient-to-r ${mainTheme?.bar ?? "from-terra-400 to-ocean-400"}`} />
            <dl className="divide-y divide-stone-100 text-sm">
              <Fact label="Citations">
                <span className="inline-flex items-center gap-1.5 font-serif text-2xl font-bold text-stone-900">
                  <QuoteIcon className="h-4 w-4 text-terra-500" />
                  {paper.citations.toLocaleString("en-US")}
                </span>
              </Fact>
              <Fact label="Published">{paper.year}</Fact>
              {paper.journal && <Fact label="Journal">{paper.journal}</Fact>}
              <Fact label="Access">{OA_LABELS[paper.oaStatus] ?? "Free to read"}</Fact>
              {paper.license && <Fact label="Licence">{paper.license}</Fact>}
              {paper.topic && <Fact label="Topic">{paper.topic}</Fact>}
              {paper.field && <Fact label="Field">{paper.field}</Fact>}
            </dl>
          </div>

          {paper.authors.some((a) => a.institution) && (
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-soft">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Institutions</h3>
              <ul className="mt-3 space-y-2 text-sm text-stone-700">
                {[...new Set(paper.authors.map((a) => a.institution).filter(Boolean))].slice(0, 6).map((inst) => (
                  <li key={inst} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terra-400" />
                    {inst}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="px-1 text-xs leading-relaxed text-stone-400">
            Record from{" "}
            <a href={`https://openalex.org/${paper.id}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">
              OpenAlex
            </a>
            . The paper is © its authors and publisher and is shown here under its open-access terms.
          </p>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="container-page max-w-5xl">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-bold">Related research</h2>
            <Link href="/library" className="text-sm font-semibold text-terra-700 hover:text-terra-800">
              Back to the library →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <PaperCard key={p.id} paper={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">{label}</dt>
      <dd className="mt-1 text-stone-800">{children}</dd>
    </div>
  );
}
