import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { ModerationActions } from "@/components/ModerationActions";
import { formatDate, formatBytes, isDemoPreprint } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation dashboard" };

const TABS = [
  { key: "PENDING", label: "Awaiting review" },
  { key: "PUBLISHED", label: "Published" },
  { key: "REJECTED", label: "Rejected" },
] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const status =
    searchParams.status && ["PENDING", "PUBLISHED", "REJECTED"].includes(searchParams.status)
      ? searchParams.status
      : "PENDING";

  const [counts, preprints] = await Promise.all([
    prisma.preprint.groupBy({ by: ["status"], _count: { status: true } }),
    prisma.preprint.findMany({
      where: { status },
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      include: {
        submittedBy: { select: { name: true, email: true, affiliation: true } },
      },
    }),
  ]);

  const countMap = new Map(counts.map((c) => [c.status, c._count.status]));

  return (
    <div className="container-page max-w-5xl py-12">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">Moderation dashboard</h1>
        <span className="badge bg-terra-100 text-terra-800">Moderator</span>
      </div>
      <p className="mt-2 text-stone-600">
        Review submissions and decide what appears on TerraNova.
      </p>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-stone-200">
        {TABS.map((tab) => {
          const active = tab.key === status;
          return (
            <Link
              key={tab.key}
              href={`/admin?status=${tab.key}`}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border-terra-600 text-terra-700"
                  : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {tab.label}{" "}
              <span className="ml-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {countMap.get(tab.key) ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* List */}
      {preprints.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-stone-600">
          Nothing here right now.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {preprints.map((p) => (
            <div key={p.id} className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={p.status} />
                <span className="badge bg-ocean-50 text-ocean-700">
                  {p.subject}
                </span>
                <span className="text-xs text-stone-400">
                  Submitted {formatDate(p.createdAt)}
                </span>
              </div>

              <h3 className="mt-3 text-xl font-semibold leading-snug">
                <Link
                  href={`/preprint/${p.slug}`}
                  className="text-stone-900 hover:text-terra-700"
                >
                  {p.title}
                </Link>
              </h3>

              <p className="mt-1 text-sm font-medium text-stone-700">
                {p.authors}
              </p>

              <p className="mt-3 line-clamp-3 text-sm text-stone-600">
                {p.abstract}
              </p>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-500">
                <span>
                  <span className="font-semibold text-stone-600">Submitter:</span>{" "}
                  {p.submittedBy.name} ({p.submittedBy.email})
                  {p.submittedBy.affiliation
                    ? ` · ${p.submittedBy.affiliation}`
                    : ""}
                </span>
                <span>
                  <span className="font-semibold text-stone-600">License:</span>{" "}
                  {p.license}
                </span>
                <span>
                  <span className="font-semibold text-stone-600">File:</span>{" "}
                  {formatBytes(p.fileSize)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {isDemoPreprint(p) ? (
                  <span className="text-sm font-semibold text-stone-400">
                    Sample entry — no PDF
                  </span>
                ) : (
                  <a
                    href={`/api/files/${p.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="text-sm font-semibold text-terra-700 hover:text-terra-800"
                  >
                    Open PDF →
                  </a>
                )}
              </div>

              {p.moderationNote && (
                <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                  <span className="font-semibold">Previous note:</span>{" "}
                  {p.moderationNote}
                </div>
              )}

              <ModerationActions id={p.id} status={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
