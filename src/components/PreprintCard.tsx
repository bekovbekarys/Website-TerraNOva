import Link from "next/link";
import { formatDate, truncate, authorList } from "@/lib/utils";

type CardPreprint = {
  slug: string;
  title: string;
  abstract: string;
  authors: string;
  subject: string;
  publishedAt: Date | string | null;
  createdAt: Date | string;
};

export function PreprintCard({ preprint }: { preprint: CardPreprint }) {
  const authors = authorList(preprint.authors);
  const shownAuthors =
    authors.length > 4
      ? `${authors.slice(0, 4).join(", ")}, +${authors.length - 4} more`
      : authors.join(", ");

  return (
    <article className="card group p-5 transition hover:border-terra-300 hover:shadow-md">
      <div className="flex items-center gap-2 text-xs">
        <Link
          href={`/browse?subject=${encodeURIComponent(preprint.subject)}`}
          className="badge bg-ocean-50 text-ocean-700 hover:bg-ocean-100"
        >
          {preprint.subject}
        </Link>
        <span className="text-stone-400">
          {formatDate(preprint.publishedAt ?? preprint.createdAt)}
        </span>
      </div>

      <h3 className="mt-2.5 text-lg font-semibold leading-snug">
        <Link
          href={`/preprint/${preprint.slug}`}
          className="text-stone-900 transition group-hover:text-terra-700"
        >
          {preprint.title}
        </Link>
      </h3>

      <p className="mt-1.5 text-sm font-medium text-stone-600">{shownAuthors}</p>

      <p className="mt-2 text-sm leading-relaxed text-stone-500">
        {truncate(preprint.abstract, 240)}
      </p>

      <Link
        href={`/preprint/${preprint.slug}`}
        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-terra-700 hover:gap-2 hover:text-terra-800"
      >
        Read preprint →
      </Link>
    </article>
  );
}
