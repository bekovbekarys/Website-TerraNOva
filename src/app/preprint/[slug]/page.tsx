import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDate,
  formatBytes,
  authorList,
  isDemoPreprint,
} from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getPreprint(slug: string) {
  return prisma.preprint.findUnique({
    where: { slug },
    include: {
      submittedBy: {
        select: { id: true, name: true, affiliation: true, email: true },
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
  return {
    title: preprint.title,
    description: preprint.abstract.slice(0, 200),
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

  return (
    <div className="container-page max-w-4xl py-10">
      <nav className="mb-6 text-sm text-stone-500">
        <Link href="/browse" className="hover:text-terra-700">
          Browse
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
            This preprint is{" "}
            {preprint.status === "PENDING"
              ? "awaiting moderation and is not yet public."
              : "not currently published."}{" "}
            Only you and moderators can see this page.
          </span>
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
          Version {preprint.version}
        </span>
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

      <p className="mt-2 text-sm text-stone-500">
        Posted{" "}
        {formatDate(preprint.publishedAt ?? preprint.createdAt)} · Submitted by{" "}
        {preprint.submittedBy.name}
        {preprint.submittedBy.affiliation
          ? `, ${preprint.submittedBy.affiliation}`
          : ""}
      </p>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {isDemoPreprint(preprint) ? (
          <span
            className="badge bg-stone-100 text-stone-500"
            title="This is a demonstration entry; no PDF is available."
          >
            Sample entry — PDF not available
          </span>
        ) : (
          <>
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener"
              className="btn-primary"
            >
              View PDF
            </a>
            <a href={`${fileUrl}?download=1`} download className="btn-secondary">
              Download ({formatBytes(preprint.fileSize)})
            </a>
          </>
        )}
        {(isOwner || isAdmin) && (
          <Link
            href={isAdmin ? "/admin" : "/dashboard"}
            className="btn-secondary"
          >
            Manage
          </Link>
        )}
      </div>

      {/* Abstract */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Abstract</h2>
        <p className="prose-abstract mt-3">{preprint.abstract}</p>
      </section>

      {/* Metadata table */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Details</h2>
        <dl className="mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          <Detail label="Subject area" value={preprint.subject} />
          <Detail label="License" value={preprint.license} />
          {preprint.keywords && (
            <Detail label="Keywords" value={preprint.keywords} />
          )}
          {preprint.comments && (
            <Detail label="Comments" value={preprint.comments} />
          )}
          <Detail
            label="Posted"
            value={formatDate(preprint.publishedAt ?? preprint.createdAt)}
          />
          {preprint.status === "PUBLISHED" && (
            <Detail label="Downloads" value={String(preprint.downloads)} />
          )}
        </dl>
      </section>

      {/* Citation */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">How to cite</h2>
        <div className="card mt-3 bg-stone-50 p-4 text-sm text-stone-700">
          {authors.join(", ")} ({new Date(
            preprint.publishedAt ?? preprint.createdAt
          ).getFullYear()}
          ). <em>{preprint.title}</em>. TerraNova preprint.
        </div>
      </section>
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
