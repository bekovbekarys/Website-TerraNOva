import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { SubmitForm } from "@/components/SubmitForm";
import { SUBJECTS, LICENSES } from "@/lib/constants";
import { getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const metadata = { title: "Submit a preprint" };

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: { replaces?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/submit");
  const t = getDict().submit;

  // If versioning an existing preprint, load it (must belong to the user, or
  // the user must be a moderator) and prefill the form.
  let initial;
  let replacesId: string | undefined;
  let replacesTitle: string | undefined;
  if (searchParams.replaces) {
    const original = await prisma.preprint.findUnique({
      where: { id: searchParams.replaces },
    });
    if (
      original &&
      (original.submittedById === user.id || user.role === "ADMIN")
    ) {
      replacesId = original.id;
      replacesTitle = original.title;
      initial = {
        title: original.title,
        authors: original.authors,
        abstract: original.abstract,
        subject: original.subject,
        keywords: original.keywords ?? "",
        license: original.license,
        comments: original.comments ?? "",
      };
    }
  }

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {replacesId ? t.titleNewVersion : t.title}
        </h1>
        <p className="mt-2 text-stone-600">{t.desc}</p>
      </div>

      <div className="card p-6 sm:p-8">
        <SubmitForm
          subjects={SUBJECTS}
          licenses={LICENSES}
          t={t}
          initial={initial}
          replacesId={replacesId}
          replacesTitle={replacesTitle}
        />
      </div>

      <p className="mt-6 text-sm text-stone-500">
        {t.needHelp}
        <Link href="/guidelines" className="font-semibold text-terra-700">
          {t.guidelinesLink}
        </Link>
        .
      </p>
    </div>
  );
}
