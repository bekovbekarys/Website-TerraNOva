import Link from "next/link";
import { PLACE_BY_KEY, THEME_BY_KEY, formatAuthors, type LibraryPaper } from "@/lib/library";
import { truncate } from "@/lib/utils";

export function OpenAccessIcon({ className }: { className?: string }) {
  // The open padlock used for open access
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2.5" />
      <path d="M8 11V7.5a4 4 0 0 1 7.7-1.5" />
      <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

export function QuoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.6 6C6.5 7.4 4.5 10 4.5 13.4V18h5.4v-5.2H7.4c.2-2 1.4-3.6 3.3-4.6L9.6 6Zm9 0c-3.1 1.4-5.1 4-5.1 7.4V18h5.4v-5.2h-2.5c.2-2 1.4-3.6 3.3-4.6L18.6 6Z" />
    </svg>
  );
}

export function PaperCard({ paper, rank }: { paper: LibraryPaper; rank?: number }) {
  const theme = paper.themes[0] ? THEME_BY_KEY[paper.themes[0]] : null;
  const href = `/library/${paper.id}`;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:border-terra-200 hover:shadow-xl hover:shadow-terra-900/5">
      <span
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${theme?.bar ?? "from-terra-400 to-ocean-400"} opacity-70 transition group-hover:opacity-100`}
      />

      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-2 text-stone-500">
          <span className="font-semibold tabular-nums text-stone-700">{paper.year}</span>
          {paper.journal && (
            <>
              <span className="text-stone-300">·</span>
              <span className="truncate italic">{paper.journal}</span>
            </>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-terra-50 px-2 py-0.5 font-semibold text-terra-700 ring-1 ring-inset ring-terra-200/70">
          <OpenAccessIcon className="h-3 w-3" />
          Open
        </span>
      </div>

      <h3 className="mt-3 font-serif text-[1.075rem] font-semibold leading-snug text-stone-900">
        <Link href={href} className="line-clamp-3 transition group-hover:text-terra-800">
          <span className="absolute inset-0" aria-hidden="true" />
          {rank != null && <span className="mr-1.5 text-terra-500">#{rank}</span>}
          {paper.title}
        </Link>
      </h3>

      <p className="mt-2 line-clamp-1 text-sm font-medium text-stone-600">{formatAuthors(paper)}</p>

      {paper.abstract && (
        <p className="mt-2.5 line-clamp-3 flex-1 text-sm leading-relaxed text-stone-500">
          {truncate(paper.abstract, 320)}
        </p>
      )}
      {!paper.abstract && <div className="flex-1" />}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {paper.themes.slice(0, 2).map((t) => (
          <span key={t} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${THEME_BY_KEY[t].chip}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${THEME_BY_KEY[t].dot}`} />
            {THEME_BY_KEY[t].short}
          </span>
        ))}
        {paper.places.slice(0, 2).map((pl) => (
          <span key={pl} className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
            <PinIcon className="h-3 w-3 text-stone-400" />
            {PLACE_BY_KEY[pl].label}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3.5 text-xs">
        <span className="inline-flex items-center gap-1.5 text-stone-500">
          <QuoteIcon className="h-3.5 w-3.5 text-stone-300" />
          <span className="font-semibold tabular-nums text-stone-700">{paper.citations.toLocaleString("en-US")}</span>
          citations
        </span>
        <span className="inline-flex items-center gap-1 font-semibold text-terra-700 transition-all group-hover:gap-2">
          Read paper <span aria-hidden="true">→</span>
        </span>
      </div>
    </article>
  );
}
