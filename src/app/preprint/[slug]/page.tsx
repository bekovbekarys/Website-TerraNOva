import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { CiteExport } from "@/components/CiteExport";
import { PreprintCard } from "@/components/PreprintCard";
import { OrcidLink } from "@/components/OrcidLink";
import { formatDate, formatBytes, authorList } from "@/lib/utils";
import { getDict, format } from "@/lib/i18n";

const CARD_FIELDS = {
  slug: true,
  title: true,
  abstract: true,
  authors: true,
  subject: true,
  publishedAt: true,
  createdAt: true,
} as const;

export const dynamic = "force-dynamic";

async function getPreprint(slug: string) {
  return prisma.preprint.findUnique({
    where: { slug },
    include: {
      submittedBy: {
        select: {
          id: true,
          name: true,
          affiliation: true,
          email: true,
          orcid: true,
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const preprint = await getPreprint(params.slug);
  if (!preprint || preprint.status !== "PUBLISHED") {
    return { title: "Preprint" };
  }
  const description = preprint.abstract.slice(0, 200);
  return {
    title: preprint.title,
    description,
    openGraph: {
      type: "article",
      title: preprint.title,
      description,
      url: `/preprint/${preprint.slug}`,
      authors: authorList(preprint.authors),
      publishedTime: (preprint.publishedAt ?? preprint.createdAt).toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: preprint.title,
      description,
    },
  };
}

export default async function PreprintPage({
  params,
}: {
  params: { slug: string };
}) {
  const preprint = await getPreprint(params.slug);
  if (!preprint) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === preprint.submittedById;
  const isAdmin = user?.role === "ADMIN";

  // Non-published preprints are visible only to their author or a moderator.
  if (preprint.status !== "PUBLISHED" && !isOwner && !isAdmin) {
    notFound();
  }

  const authors = authorList(preprint.authors);
  const fileUrl = `/api/files/${preprint.slug}`;
  const year = new Date(
    preprint.publishedAt ?? preprint.createdAt
  ).getFullYear();
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
  const citationUrl = `${siteUrl}/preprint/${preprint.slug}`;

  // Version history within this preprint's group (if any).
  const versions = preprint.versionGroupId
    ? await prisma.preprint.findMany({
        where: { versionGroupId: preprint.versionGroupId },
        orderBy: { version: "desc" },
        select: {
          id: true,
          slug: true,
          version: true,
          status: true,
          isLatest: true,
          publishedAt: true,
          createdAt: true,
        },
      })
    : [];
  const latest = versions.find((v) => v.isLatest && v.status === "PUBLISHED");
  const hasNewerVersion = Boolean(latest && latest.slug !== preprint.slug);
  // Only show versions the viewer is allowed to see.
  const visibleVersions = versions.filter(
    (v) => v.status === "PUBLISHED" || isOwner || isAdmin
  );

  // Related preprints (only meaningful for a published page).
  const [relatedInSubject, relatedByAuthor] =
    preprint.status === "PUBLISHED"
      ? await Promise.all([
          prisma.preprint.findMany({
            where: {
              status: "PUBLISHED",
              isLatest: true,
              subject: preprint.subject,
              id: { not: preprint.id },
            },
            orderBy: { publishedAt: "desc" },
            take: 3,
            select: CARD_FIELDS,
          }),
          prisma.preprint.findMany({
            where: {
              status: "PUBLISHED",
              isLatest: true,
              submittedById: preprint.submittedById,
              id: { not: preprint.id },
            },
            orderBy: { publishedAt: "desc" },
            take: 3,
            select: CARD_FIELDS,
          }),
        ])
      : [[], []];

  const t = getDict().preprint;

  return (
    <div className="container-page max-w-4xl py-10">
      <nav className="mb-6 text-sm text-stone-500">
        <Link href="/browse" className="hover:text-terra-700">
          {t.browse}
        </Link>{" "}
        /{" "}
        <Link
          href={`/browse?subject=${encodeURIComponent(preprint.subject)}`}
          className="hover:text-terra-700"
        >
          {preprint.subject}
        </Link>
      </nav>

      {preprint.status !== "PUBLISHED" && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <StatusBadge status={preprint.status} />
          <span>
            {preprint.status === "PENDING"
              ? t.pendingBanner
              : t.unpublishedBanner}
          </span>
        </div>
      )}

      {hasNewerVersion && latest && (
        <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-ocean-200 bg-ocean-50 px-4 py-3 text-sm text-ocean-900">
          <span>{t.newerVersion}</span>
          <Link
            href={`/preprint/${latest.slug}`}
            className="font-semibold underline"
          >
            {t.viewLatest}
          </Link>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={`/browse?subject=${encodeURIComponent(preprint.subject)}`}
          className="badge bg-ocean-50 text-ocean-700"
        >
          {preprint.subject}
        </Link>
        <span className="badge bg-stone-100 text-stone-600">
          {t.version} {preprint.version}
        </span>
        {preprint.doi && (
          <a
            href={preprint.zenodoUrl || `https://doi.org/${preprint.doi}`}
            target="_blank"
            rel="noopener"
            className="badge bg-terra-100 text-terra-800 hover:bg-terra-200"
          >
            DOI: {preprint.doi}
          </a>
        )}
      </div>

      <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
        {preprint.title}
      </h1>

      <div className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-base font-medium text-stone-700">
        {authors.map((a, i) => (
          <span key={i}>
            {a}
            {i < authors.length - 1 ? "," : ""}
          </span>
        ))}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
        <span>
          {t.posted} {formatDate(preprint.publishedAt ?? preprint.createdAt)} ·{" "}
          {t.submittedBy} {preprint.submittedBy.name}
          {preprint.submittedBy.affiliation
            ? `, ${preprint.submittedBy.affiliation}`
            : ""}
        </span>
        {preprint.submittedBy.orcid && (
          <OrcidLink orcid={preprint.submittedBy.orcid} />
        )}
      </p>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={fileUrl} target="_blank" rel="noopener" className="btn-primary">
          {t.viewPdf}
        </a>
        <a href={`${fileUrl}?download=1`} download className="btn-secondary">
          {t.download} ({formatBytes(preprint.fileSize)})
        </a>
        {(isOwner || isAdmin) && (
          <Link
            href={isAdmin ? "/admin" : "/dashboard"}
            className="btn-secondary"
          >
            {t.manage}
          </Link>
        )}
      </div>

      {/* Abstract */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">{t.abstract}</h2>
        <p className="prose-abstract mt-3">{preprint.abstract}</p>
      </section>

      {/* Inline PDF preview */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">{t.readPaper}</h2>
        <div className="card mt-3 overflow-hidden p-0">
          <iframe
            src={`${fileUrl}#view=FitH`}
            title={`PDF preview of ${preprint.title}`}
            loading="lazy"
            className="h-[80vh] w-full"
          />
        </div>
        <p className="mt-2 text-sm text-stone-500">
          {t.troubleViewing}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener"
            className="font-semibold text-terra-700"
          >
            {t.openNewTab}
          </a>
          .
        </p>
      </section>

      {/* Metadata table */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">{t.details}</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Detail label={t.subjectArea} value={preprint.subject} />
          <Detail label={t.license} value={preprint.license} />
          {preprint.keywords && (
            <Detail label={t.keywords} value={preprint.keywords} />
          )}
          {preprint.comments && (
            <Detail label={t.comments} value={preprint.comments} />
          )}
          <Detail
            label={t.posted}
            value={formatDate(preprint.publishedAt ?? preprint.createdAt)}
          />
          {preprint.status === "PUBLISHED" && (
            <Detail label={t.downloads} value={String(preprint.downloads)} />
          )}
        </dl>
      </section>

      {/* Citation */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">{t.howToCite}</h2>
        <CiteExport
          title={preprint.title}
          authors={authors}
          year={year}
          url={citationUrl}
          t={t}
        />
        {preprint.doi && (
          <p className="mt-3 text-sm text-stone-600">
            DOI:{" "}
            <a
              href={preprint.zenodoUrl || `https://doi.org/${preprint.doi}`}
              target="_blank"
              rel="noopener"
              className="font-semibold text-terra-700 hover:text-terra-800"
            >
              https://doi.org/{preprint.doi}
            </a>
          </p>
        )}
      </section>

      {/* Version history */}
      {visibleVersions.length > 1 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">{t.versionHistory}</h2>
          <ul className="mt-3 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200">
            {visibleVersions.map((v) => {
              const isCurrent = v.slug === preprint.slug;
              return (
                <li
                  key={v.id}
                  className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm ${
                    isCurrent ? "bg-stone-50" : ""
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-stone-800">
                      {t.version} {v.version}
                    </span>
                    {v.isLatest && v.status === "PUBLISHED" && (
                      <span className="badge bg-terra-100 text-terra-700">
                        {t.latest}
                      </span>
                    )}
                    {v.status !== "PUBLISHED" && (isOwner || isAdmin) && (
                      <StatusBadge status={v.status} />
                    )}
                    <span className="text-stone-400">
                      {formatDate(v.publishedAt ?? v.createdAt)}
                    </span>
                  </span>
                  {isCurrent ? (
                    <span className="text-stone-400">{t.viewing}</span>
                  ) : (
                    <Link
                      href={`/preprint/${v.slug}`}
                      className="font-semibold text-terra-700 hover:text-terra-800"
                    >
                      {t.viewVersion}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Related preprints */}
      {relatedInSubject.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold">
            {format(t.moreIn, { subject: preprint.subject })}
          </h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {relatedInSubject.map((p) => (
              <PreprintCard key={p.slug} preprint={p} />
            ))}
          </div>
        </section>
      )}

      {relatedByAuthor.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold">
            {format(t.moreBy, { author: preprint.submittedBy.name })}
          </h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {relatedByAuthor.map((p) => (
              <PreprintCard key={p.slug} preprint={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone-100 pb-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-stone-800">{value}</dd>
    </div>
  );
}
