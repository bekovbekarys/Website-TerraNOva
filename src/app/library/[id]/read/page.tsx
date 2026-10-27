import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPaper, formatAuthors } from "@/lib/library";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const paper = await getPaper(params.id);
  return { title: paper ? `Read: ${paper.title}` : "Read paper" };
}

export default async function ReadPaperPage({ params }: { params: { id: string } }) {
  const paper = await getPaper(params.id);
  if (!paper) notFound();

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[560px] flex-col bg-stone-900">
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#06261b] px-4 py-2.5 text-white sm:px-6">
        <Link
          href={`/library/${paper.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-terra-100 transition hover:bg-white/10"
        >
          ← Back
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-sm font-semibold sm:text-base">{paper.title}</p>
          <p className="truncate text-xs text-terra-100/70">
            {formatAuthors(paper, 3)} · {paper.journal ? `${paper.journal}, ` : ""}
            {paper.year}
          </p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Open in new tab ↗
            </a>
          )}
          {paper.landingUrl && (
            <a
              href={paper.landingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-terra-900 transition hover:bg-terra-50"
            >
              Publisher page
            </a>
          )}
        </div>
      </div>
      <iframe
        src={`/api/library/pdf/${paper.id}`}
        title={paper.title}
        className="w-full flex-1 border-0 bg-stone-100"
      />
    </div>
  );
}
