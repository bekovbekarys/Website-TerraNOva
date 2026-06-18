import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-3 text-stone-600">
        How {SITE_NAME} collects, uses, and protects your information.
      </p>

      <div className="prose-abstract mt-8 space-y-6 text-stone-700">
        <p>
          This policy explains what personal data {SITE_NAME} processes and why.
          We aim to collect only what is needed to run an open preprint server.
        </p>

        <section id="what-we-collect">
          <h2 className="text-xl font-bold">Information we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Account details:</strong> your name, email address, and
              optional affiliation and ORCID, provided when you register.
            </li>
            <li>
              <strong>Submissions:</strong> the manuscripts, metadata, and files
              you upload, along with their moderation status.
            </li>
            <li>
              <strong>Technical data:</strong> limited server logs such as IP
              address and request information, used for security and to prevent
              abuse.
            </li>
          </ul>
        </section>

        <section id="how-we-use">
          <h2 className="text-xl font-bold">How we use your information</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>To operate your account and publish your preprints.</li>
            <li>
              To send essential service emails, such as password resets and
              decisions about your submissions.
            </li>
            <li>To moderate content and protect the site from abuse and spam.</li>
          </ul>
          <p className="mt-2">
            We do not sell your personal data. Published preprints, including the
            author names and metadata you provide, are intentionally public.
          </p>
        </section>

        <section id="processors">
          <h2 className="text-xl font-bold">Service providers</h2>
          <p className="mt-2">
            We use third parties to run the service, including a hosting provider
            and an email delivery provider. These providers process data only on
            our behalf and only as needed to deliver the service.
          </p>
        </section>

        <section id="retention">
          <h2 className="text-xl font-bold">Data retention</h2>
          <p className="mt-2">
            We keep account and submission data for as long as your account is
            active. Password reset links expire automatically. You can ask us to
            delete your account and associated personal data, subject to keeping
            published scholarly records where appropriate.
          </p>
        </section>

        <section id="rights">
          <h2 className="text-xl font-bold">Your rights</h2>
          <p className="mt-2">
            Depending on where you live, you may have rights to access, correct,
            export, or delete your personal data. To exercise these, contact us
            using the details below.
          </p>
        </section>

        <section id="contact">
          <h2 className="text-xl font-bold">Contact</h2>
          <p className="mt-2">
            Questions about privacy? Email{" "}
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
        <Link href="/terms" className="btn-secondary">
          Read the Terms of Use
        </Link>
      </div>
    </div>
  );
}
