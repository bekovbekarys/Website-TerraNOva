"use client";

import { useState } from "react";

type Props = {
  title: string;
  authors: string[];
  year: number;
  url: string;
};

function citeKey(authors: string[], year: number): string {
  const first = authors[0] ?? "terranova";
  const lastName = first.trim().split(/\s+/).pop() ?? "terranova";
  const clean = lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean || "terranova"}${year}`;
}

function buildBibtex({ title, authors, year, url }: Props): string {
  return [
    `@misc{${citeKey(authors, year)},`,
    `  title        = {${title}},`,
    `  author       = {${authors.join(" and ")}},`,
    `  year         = {${year}},`,
    `  howpublished = {TerraNova preprint},`,
    `  url          = {${url}}`,
    `}`,
  ].join("\n");
}

function buildRis({ title, authors, year, url }: Props): string {
  return [
    "TY  - GEN",
    `TI  - ${title}`,
    ...authors.map((a) => `AU  - ${a}`),
    `PY  - ${year}`,
    "PB  - TerraNova",
    `UR  - ${url}`,
    "ER  - ",
  ].join("\n");
}

export function CiteExport(props: Props) {
  const { title, authors, year } = props;
  const [copied, setCopied] = useState(false);

  const plain = `${authors.join(", ")} (${year}). ${title}. TerraNova preprint. ${props.url}`;

  async function copyPlain() {
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may be unavailable; the text remains visible to copy manually.
    }
  }

  function download(format: "bib" | "ris") {
    const content = format === "bib" ? buildBibtex(props) : buildRis(props);
    const mime = format === "bib" ? "application/x-bibtex" : "application/x-research-info-systems";
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `${citeKey(authors, year)}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="card mt-3 bg-stone-50 p-4">
      <p className="text-sm text-stone-700">
        {authors.join(", ")} ({year}). <em>{title}</em>. TerraNova preprint.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copyPlain} className="btn-secondary text-xs">
          {copied ? "Copied!" : "Copy citation"}
        </button>
        <button
          type="button"
          onClick={() => download("bib")}
          className="btn-secondary text-xs"
        >
          Download BibTeX
        </button>
        <button
          type="button"
          onClick={() => download("ris")}
          className="btn-secondary text-xs"
        >
          Download RIS
        </button>
      </div>
    </div>
  );
}
