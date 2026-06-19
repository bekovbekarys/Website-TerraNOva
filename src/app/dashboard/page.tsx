import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";
import { getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "My submissions" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { submitted?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const t = getDict().dashboard;

  const preprints = await prisma.preprint.findMany({
    where: { submittedById: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-page max-w-4xl py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="mt-1 text-stone-600">{t.sub}</p>
        </div>
        <Link href="/submit" className="btn-primary">
          {t.newSubmission}
        </Link>
      </div>

      {searchParams.submitted === "1" && (
        <div className="mt-6 rounded-lg border border-terra-200 bg-terra-50 px-4 py-3 text-sm text-terra-800">
          {t.submitted}
        </div>
      )}

      {preprints.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-lg font-semibold text-stone-900">{t.emptyTitle}</p>
          <p className="mt-1 text-stone-600">{t.emptySub}</p>
          <Link href="/submit" className="btn-primary mt-5">
            {t.emptyCta}
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {preprints.map((p) => (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-stone-400">
                      {p.subject} · {formatDate(p.createdAt)}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">
                    <Link
                      href={`/preprint/${p.slug}`}
                      className="text-stone-900 hover:text-terra-700"
                    >
                      {p.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">{p.authors}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {p.status === "PUBLISHED" && p.isLatest && (
                    <Link
                      href={`/submit?replaces=${p.id}`}
                      className="btn-secondary"
                    >
                      {t.newVersion}
                    </Link>
                  )}
                  <Link href={`/preprint/${p.slug}`} className="btn-secondary">
                    {t.view}
                  </Link>
                </div>
              </div>

              {p.status === "REJECTED" && p.moderationNote && (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <span className="font-semibold">{t.moderatorNote}</span>{" "}
                  {p.moderationNote}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
