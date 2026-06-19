"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";

type InitialValues = {
  title: string;
  authors: string;
  abstract: string;
  subject: string;
  keywords: string;
  license: string;
  comments: string;
};

export function SubmitForm({
  subjects,
  licenses,
  t,
  initial,
  replacesId,
  replacesTitle,
}: {
  subjects: string[];
  licenses: string[];
  t: Dict["submit"];
  initial?: InitialValues;
  replacesId?: string;
  replacesTitle?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/preprints", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t.failed);
        setLoading(false);
        return;
      }
      router.push("/dashboard?submitted=1");
      router.refresh();
    } catch {
      setError(t.networkError);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {replacesId && (
        <>
          <input type="hidden" name="replacesId" value={replacesId} />
          <div className="rounded-lg border border-ocean-200 bg-ocean-50 px-4 py-3 text-sm text-ocean-900">
            {t.newVersionPre}
            <strong>{t.newVersionBold}</strong>
            {replacesTitle
              ? t.newVersionOf.replace("{title}", replacesTitle)
              : ""}
            {t.newVersionPost}
          </div>
        </>
      )}

      <div>
        <label className="label" htmlFor="title">
          {t.titleLabel}
        </label>
        <input
          id="title"
          name="title"
          required
          className="input"
          maxLength={300}
          defaultValue={initial?.title ?? ""}
        />
      </div>

      <div>
        <label className="label" htmlFor="authors">
          {t.authors}
        </label>
        <input
          id="authors"
          name="authors"
          required
          className="input"
          placeholder="Jane Doe, John Smith, …"
          defaultValue={initial?.authors ?? ""}
        />
        <p className="mt-1 text-xs text-stone-500">{t.authorsHint}</p>
      </div>

      <div>
        <label className="label" htmlFor="abstract">
          {t.abstract}
        </label>
        <textarea
          id="abstract"
          name="abstract"
          required
          rows={8}
          className="input"
          maxLength={6000}
          defaultValue={initial?.abstract ?? ""}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="subject">
            {t.subject}
          </label>
          <select
            id="subject"
            name="subject"
            required
            className="input"
            defaultValue={initial?.subject ?? ""}
          >
            <option value="" disabled>
              {t.selectSubject}
            </option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="license">
            {t.license}
          </label>
          <select
            id="license"
            name="license"
            required
            className="input"
            defaultValue={initial?.license ?? "CC BY 4.0"}
          >
            {licenses.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="keywords">
          {t.keywords} <span className="text-stone-400">{t.optional}</span>
        </label>
        <input
          id="keywords"
          name="keywords"
          className="input"
          placeholder={t.keywordsPlaceholder}
          defaultValue={initial?.keywords ?? ""}
        />
      </div>

      <div>
        <label className="label" htmlFor="comments">
          {t.comments} <span className="text-stone-400">{t.optional}</span>
        </label>
        <input
          id="comments"
          name="comments"
          className="input"
          placeholder={t.commentsPlaceholder}
          defaultValue={initial?.comments ?? ""}
        />
      </div>

      <div>
        <label className="label" htmlFor="file">
          {t.manuscript}
        </label>
        <label
          htmlFor="file"
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 px-6 py-10 text-center transition hover:border-terra-400 hover:bg-terra-50/40"
        >
          <svg
            className="h-10 w-10 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
          <span className="mt-2 text-sm font-medium text-stone-700">
            {fileName ?? t.chooseFile}
          </span>
          <span className="mt-1 text-xs text-stone-500">{t.pdfOnly}</span>
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </div>

      <div className="rounded-lg bg-ocean-50 px-4 py-3 text-sm text-ocean-900">
        {t.confirm}
      </div>

      <button type="submit" className="btn-primary w-full sm:w-auto" disabled={loading}>
        {loading ? t.uploading : t.submitBtn}
      </button>
    </form>
  );
}
