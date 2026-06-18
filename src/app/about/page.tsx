import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold">About {SITE_NAME}</h1>
      <p className="mt-3 text-lg text-stone-600">{SITE_TAGLINE}.</p>

      <div className="prose-abstract mt-8 space-y-6 text-stone-700">
        <p>
          {SITE_NAME} is a free, open repository where researchers can share
          preprints — complete manuscripts posted before, or alongside, formal
          peer review. Posting a preprint lets you share findings quickly,
          establish priority, gather feedback, and make your work openly
          available to anyone, anywhere, at no cost.
        </p>

        <section id="scope">
          <h2 className="text-xl font-bold">Scope</h2>
          <p className="mt-2">
            We welcome scholarly work across the Earth, planetary, and
            environmental sciences — from atmospheric science and oceanography to
            geology, hydrology, paleontology, natural hazards, and sustainability
            policy. If your work studies the Earth system, it belongs here.
          </p>
        </section>

        <section id="moderation">
          <h2 className="text-xl font-bold">Moderation policy</h2>
          <p className="mt-2">
            Every submission is screened by a moderator before it appears
            publicly. Moderation is a <strong>suitability</strong> check, not a
            scientific judgement: we confirm that a submission is a scholarly
            manuscript within scope, is not spam or plagiarism, and does not
            contain offensive or non-research material. We do not evaluate the
            correctness of the science — that is the role of readers and, later,
            peer review.
          </p>
          <p className="mt-2">
            Moderators may decline a submission that falls outside these
            guidelines, and will share a brief reason with the author. Authors
            can revise and resubmit.
          </p>
        </section>

        <section id="licensing">
          <h2 className="text-xl font-bold">Licensing</h2>
          <p className="mt-2">
            Authors retain copyright of their work and choose the license under
            which it is shared (for example, Creative Commons CC BY 4.0). By
            submitting, you confirm that you hold the rights to share the
            manuscript and to grant the license you select.
          </p>
        </section>

        <section id="citing">
          <h2 className="text-xl font-bold">Citing preprints</h2>
          <p className="mt-2">
            Each published preprint has a permanent page and a suggested citation.
            Remember that preprints are not peer-reviewed; cite them as preprints
            and check whether a peer-reviewed version exists.
          </p>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold">Contact</h2>
          <p className="mt-2">
            Questions about a submission or our policies? Reach the moderation
            team at{" "}
            <a
              href="mailto:tabekarys@gmail.com"
              className="font-semibold text-terra-700"
            >
              tabekarys@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <div className="mt-10 flex gap-3">
        <Link href="/submit" className="btn-primary">
          Submit a preprint
        </Link>
        <Link href="/browse" className="btn-secondary">
          Browse the archive
        </Link>
      </div>
    </div>
  );
}
