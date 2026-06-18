import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold">Terms of Use</h1>
      <p className="mt-3 text-stone-600">
        The rules for using {SITE_NAME}.
      </p>

      <div className="prose-abstract mt-8 space-y-6 text-stone-700">
        <p>
          By creating an account or using {SITE_NAME}, you agree to these terms.
          If you do not agree, please do not use the service.
        </p>

        <section id="accounts">
          <h2 className="text-xl font-bold">Your account</h2>
          <p className="mt-2">
            You are responsible for the accuracy of your account details and for
            keeping your password secure. You must be able to lawfully enter into
            this agreement.
          </p>
        </section>

        <section id="submissions">
          <h2 className="text-xl font-bold">Submissions and rights</h2>
          <p className="mt-2">
            By submitting a preprint, you confirm that you hold the rights to
            share it and to grant the license you select, and that the work is
            yours or properly attributed. You retain copyright in your work and
            choose the license under which it is shared.
          </p>
          <p className="mt-2">
            You grant {SITE_NAME} the right to host, display, and distribute your
            submission in line with the license you choose.
          </p>
        </section>

        <section id="acceptable-use">
          <h2 className="text-xl font-bold">Acceptable use</h2>
          <p className="mt-2">You agree not to:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Post plagiarized, fraudulent, or non-scholarly material.</li>
            <li>
              Upload content that is unlawful, infringing, harmful, or offensive.
            </li>
            <li>Attempt to disrupt, abuse, or gain unauthorized access to the service.</li>
            <li>Submit spam or use automated tools to create accounts.</li>
          </ul>
        </section>

        <section id="moderation">
          <h2 className="text-xl font-bold">Moderation</h2>
          <p className="mt-2">
            Every submission is screened for suitability before it appears
            publicly. We may decline, unpublish, or remove content that breaches
            these terms, and we may suspend accounts that do so. Moderation is a
            suitability check, not a scientific endorsement. See our{" "}
            <Link href="/about#moderation" className="font-semibold text-terra-700">
              moderation policy
            </Link>{" "}
            for details.
          </p>
        </section>

        <section id="disclaimer">
          <h2 className="text-xl font-bold">Disclaimer and liability</h2>
          <p className="mt-2">
            Preprints are not peer-reviewed. The service is provided on an as-is
            basis without warranties of any kind. To the extent permitted by law,
            {" "}
            {SITE_NAME} is not liable for any loss arising from use of the service
            or reliance on content posted by users.
          </p>
        </section>

        <section id="changes">
          <h2 className="text-xl font-bold">Changes</h2>
          <p className="mt-2">
            We may update these terms from time to time. Continued use after a
            change means you accept the updated terms.
          </p>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold">Contact</h2>
          <p className="mt-2">
            Questions about these terms? Email{" "}
            <a
              href="mailto:tabekarys@gmail.com"
              className="font-semibold text-terra-700"
            >
              tabekarys@gmail.com
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-stone-500">
          This page is a general template and is not legal advice. Please review
          and adapt it to your jurisdiction before relying on it.
        </p>
      </div>

      <div className="mt-10">
        <Link href="/privacy" className="btn-secondary">
          Read the Privacy Policy
        </Link>
      </div>
    </div>
  );
}
