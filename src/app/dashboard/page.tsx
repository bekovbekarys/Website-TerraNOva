import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "My submissions" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { submitted?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const preprints = await prisma.preprint.findMany({
    where: { submittedById: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container-page max-w-4xl py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My submissions</h1>
          <p className="mt-1 text-stone-600">
            Track the status of every preprint you&apos;ve submitted.
          </p>
        </div>
        <Link href="/submit" className="btn-primary">
          New submission
        </Link>
      </div>

      {searchParams.submitted === "1" && (
        <div className="mt-6 rounded-lg border border-terra-200 bg-terra-50 px-4 py-3 text-sm text-terra-800">
          Thanks! Your preprint has been received and is now awaiting moderation.
          You&apos;ll see it go public here once it&apos;s approved.
        </div>
      )}

      {preprints.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <p className="text-lg font-semibold text-stone-900">
            You haven&apos;t submitted anything yet.
          </p>
          <p className="mt-1 text-stone-600">
            Ready to share your research with the world?
          </p>
          <Link href="/submit" className="btn-primary mt-5">
            Submit your first preprint
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
                <Link
                  href={`/preprint/${p.slug}`}
                  className="btn-secondary shrink-0"
                >
                  View
                </Link>
              </div>

              {p.status === "REJECTED" && p.moderationNote && (
                <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <span className="font-semibold">Moderator note:</span>{" "}
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
