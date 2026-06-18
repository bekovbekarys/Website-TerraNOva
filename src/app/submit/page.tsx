import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SubmitForm } from "@/components/SubmitForm";
import { SUBJECTS, LICENSES } from "@/lib/constants";

export const metadata = { title: "Submit a preprint" };

export default async function SubmitPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/submit");

  return (
    <div className="container-page max-w-3xl py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Submit a preprint</h1>
        <p className="mt-2 text-stone-600">
          Share your manuscript with the community. Submissions are screened by a
          moderator for suitability (not scientific judgement) and usually go
          live shortly after.
        </p>
      </div>

      <div className="card p-6 sm:p-8">
        <SubmitForm subjects={SUBJECTS} licenses={LICENSES} />
      </div>

      <p className="mt-6 text-sm text-stone-500">
        Need help? See our{" "}
        <Link href="/guidelines" className="font-semibold text-terra-700">
          submission guidelines and preprint template
        </Link>
        .
      </p>
    </div>
  );
}
