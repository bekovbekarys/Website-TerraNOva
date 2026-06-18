import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export const metadata = { title: "Submission guidelines" };

function Rule({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-terra-100 text-xs font-bold text-terra-700">
        ✓
      </span>
      <div>
        <p className="font-semibold text-stone-900">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-stone-600">{children}</p>
      </div>
    </div>
  );
}

export default function GuidelinesPage() {
  return (
    <div className="container-page max-w-3xl py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-terra-700">
        For authors
      </p>
      <h1 className="mt-2 text-3xl font-bold">Submission guidelines</h1>
      <p className="mt-3 text-lg text-stone-600">
        A short guide to preparing a clean, professional preprint that readers
        and moderators can navigate with ease. Following these will help your
        submission get published quickly.
      </p>

      {/* Quick checklist */}
      <section className="mt-10">
        <h2 className="text-xl font-bold">Before you submit</h2>
        <div className="card mt-4 space-y-4 p-6">
          <Rule title="One single PDF file">
            Combine your manuscript, figures, tables, and references into one PDF
            (max 30 MB). We accept PDF only, so export from Word, LaTeX, or Google
            Docs before uploading.
          </Rule>
          <Rule title="You hold the rights to share it">
            Submit only work you authored or have permission to post, and choose a
            license that reflects how others may reuse it.
          </Rule>
          <Rule title="It is a complete, scholarly manuscript">
            Posters, slide decks, and incomplete drafts are not a good fit.
            Include enough detail for a reader to understand and evaluate the
            work.
          </Rule>
          <Rule title="Author names and order are final at submission">
            List every author in the order they should appear, separated by
            commas. Make sure all co-authors agree to the posting.
          </Rule>
          <Rule title="The abstract is plain text">
            Paste your abstract as plain text (no equations as images). It is what
            readers see first in search results and on your preprint page.
          </Rule>
        </div>
      </section>

      {/* How a preprint should look */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">How your manuscript should be structured</h2>
        <p className="mt-2 text-stone-600">
          Inside your PDF, a typical Earth-science preprint follows this order.
          Use it as a starting template and adapt it to your study.
        </p>

        <div className="card mt-4 overflow-hidden">
          <div className="border-b border-stone-200 bg-stone-50 px-5 py-3 text-sm font-semibold text-stone-700">
            Preprint template
          </div>
          <div className="space-y-5 p-6 text-sm leading-relaxed text-stone-700">
            <TemplateItem n="1" label="Title">
              Clear and specific, describing what was studied. Avoid abbreviations
              where possible.
            </TemplateItem>
            <TemplateItem n="2" label="Authors and affiliations">
              Full names, each with an institution. Mark the corresponding author
              and include an email. ORCID iDs are encouraged.
            </TemplateItem>
            <TemplateItem n="3" label="Abstract">
              150 to 300 words summarising the question, methods, key results, and
              significance. No citations or undefined abbreviations.
            </TemplateItem>
            <TemplateItem n="4" label="Keywords">
              Three to six terms that help readers find your work.
            </TemplateItem>
            <TemplateItem n="5" label="Introduction">
              Background, the gap or question you address, and your objectives.
            </TemplateItem>
            <TemplateItem n="6" label="Data and methods">
              Study area, datasets, instruments, and analysis steps, described so
              the work could be reproduced.
            </TemplateItem>
            <TemplateItem n="7" label="Results">
              Findings presented with figures and tables, each numbered and
              captioned.
            </TemplateItem>
            <TemplateItem n="8" label="Discussion">
              Interpretation, comparison with prior work, limitations, and
              implications.
            </TemplateItem>
            <TemplateItem n="9" label="Conclusions">
              The main takeaways in a few sentences.
            </TemplateItem>
            <TemplateItem n="10" label="Declarations">
              Funding, conflicts of interest, author contributions, and a data
              availability statement.
            </TemplateItem>
            <TemplateItem n="11" label="References">
              A consistent citation style throughout (for example APA or a journal
              style). Include DOIs where available.
            </TemplateItem>
          </div>
        </div>
      </section>

      {/* Formatting tips */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">Formatting tips</h2>
        <ul className="mt-4 space-y-2 text-stone-700">
          {[
            "Use a standard page size (A4 or US Letter) with readable margins.",
            "Number every page, figure, and table.",
            "Embed fonts when exporting to PDF so equations and symbols display correctly.",
            "Keep figures legible at 100% zoom; place captions directly below each figure.",
            "Write a descriptive file name, for example smith-2026-glacier-retreat.pdf.",
            "Spell-check and proofread; a clean manuscript is reviewed faster.",
          ].map((tip) => (
            <li key={tip} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terra-500" />
              <span className="text-sm leading-relaxed">{tip}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* What happens next */}
      <section className="mt-12">
        <h2 className="text-xl font-bold">What happens after you submit</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-600">
          Your submission is saved to your dashboard with the status{" "}
          <span className="badge bg-amber-100 text-amber-800">Under moderation</span>.
          A moderator checks that it fits {SITE_NAME} and then publishes it, at
          which point it becomes public and citable. If anything needs changing,
          the moderator will share a short note and you can revise and resubmit.
        </p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/submit" className="btn-primary">
          Submit a preprint
        </Link>
        <Link href="/about" className="btn-secondary">
          Read our policies
        </Link>
      </div>
    </div>
  );
}

function TemplateItem({
  n,
  label,
  children,
}: {
  n: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-terra-600 text-xs font-bold text-white">
        {n}
      </span>
      <div>
        <p className="font-semibold text-stone-900">{label}</p>
        <p className="mt-0.5 text-stone-600">{children}</p>
      </div>
    </div>
  );
}
