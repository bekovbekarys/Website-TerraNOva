import "server-only";
import { readFile } from "@/lib/storage";

const API_BASE = (process.env.ZENODO_API_BASE || "https://zenodo.org/api").replace(
  /\/+$/,
  ""
);
const TOKEN = process.env.ZENODO_TOKEN || "";
const COMMUNITY = process.env.ZENODO_COMMUNITY || "";

export function zenodoConfigured(): boolean {
  return TOKEN.trim().length > 0;
}

export function isSandbox(): boolean {
  return API_BASE.includes("sandbox");
}

// Map TerraNova licence labels to Zenodo licence identifiers.
const LICENSE_MAP: Record<string, string> = {
  "CC BY 4.0": "cc-by-4.0",
  "CC BY-SA 4.0": "cc-by-sa-4.0",
  "CC BY-NC 4.0": "cc-by-nc-4.0",
  "CC BY-NC-ND 4.0": "cc-by-nc-nd-4.0",
  "CC0 1.0 (Public Domain)": "cc0-1.0",
  // Zenodo open-access records require an open licence; fall back to CC BY.
  "All rights reserved": "cc-by-4.0",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Zenodo expects creator names as "Family, Given". Best-effort parse of a
// free-text, comma-separated author list.
function toCreators(authors: string): { name: string }[] {
  return authors
    .split(/[,;]+/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((full) => {
      const parts = full.split(/\s+/);
      if (parts.length === 1) return { name: parts[0] };
      const family = parts[parts.length - 1];
      const given = parts.slice(0, -1).join(" ");
      return { name: `${family}, ${given}` };
    });
}

async function readBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "";
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return { Authorization: `Bearer ${TOKEN}`, ...(extra || {}) };
}

export type PreprintForDoi = {
  title: string;
  abstract: string;
  authors: string;
  keywords: string | null;
  license: string;
  subject: string;
  publishedAt: Date | null;
  createdAt: Date;
  fileStoredName: string;
  fileOriginalName: string;
};

export type MintResult = {
  doi: string;
  recordUrl: string;
  conceptDoi: string | null;
  recordId: string;
};

/**
 * Uploads a preprint to Zenodo and publishes it, returning the minted DOI.
 * Publishing on Zenodo is irreversible, so callers should guard carefully.
 */
export async function mintDoiForPreprint(p: PreprintForDoi): Promise<MintResult> {
  if (!zenodoConfigured()) {
    throw new Error("Zenodo is not configured (ZENODO_TOKEN is empty).");
  }

  // 1) Create an empty deposition.
  const createRes = await fetch(`${API_BASE}/deposit/depositions`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: "{}",
  });
  if (!createRes.ok) {
    throw new Error(
      `Zenodo could not create a deposition (${createRes.status}). ${await readBody(createRes)}`
    );
  }
  const dep = await createRes.json();
  const depId: number = dep.id;
  const bucketUrl: string | undefined = dep?.links?.bucket;

  // 2) Upload the PDF.
  const fileBuf = await readFile(p.fileStoredName);
  const filename = (p.fileOriginalName || `${depId}.pdf`).replace(/[^a-zA-Z0-9._-]/g, "_");

  if (bucketUrl) {
    const up = await fetch(`${bucketUrl}/${encodeURIComponent(filename)}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/octet-stream" }),
      body: new Uint8Array(fileBuf),
    });
    if (!up.ok) {
      throw new Error(`Zenodo file upload failed (${up.status}). ${await readBody(up)}`);
    }
  } else {
    // Fallback to the classic files endpoint.
    const form = new FormData();
    form.append("name", filename);
    form.append(
      "file",
      new Blob([new Uint8Array(fileBuf)], { type: "application/pdf" }),
      filename
    );
    const up = await fetch(`${API_BASE}/deposit/depositions/${depId}/files`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    if (!up.ok) {
      throw new Error(`Zenodo file upload failed (${up.status}). ${await readBody(up)}`);
    }
  }

  // 3) Attach metadata.
  const keywords = [
    ...(p.keywords
      ? p.keywords.split(/[,;]+/).map((k) => k.trim()).filter(Boolean)
      : []),
    p.subject,
  ];
  const metadata: Record<string, unknown> = {
    upload_type: "publication",
    publication_type: "preprint",
    title: p.title,
    description: escapeHtml(p.abstract).replace(/\r?\n/g, "<br>"),
    creators: toCreators(p.authors),
    keywords,
    access_right: "open",
    license: LICENSE_MAP[p.license] || "cc-by-4.0",
    publication_date: (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10),
  };
  if (COMMUNITY) metadata.communities = [{ identifier: COMMUNITY }];

  const metaRes = await fetch(`${API_BASE}/deposit/depositions/${depId}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ metadata }),
  });
  if (!metaRes.ok) {
    throw new Error(
      `Zenodo rejected the metadata (${metaRes.status}). ${await readBody(metaRes)}`
    );
  }

  // 4) Publish (mints the DOI). This step is irreversible.
  const pubRes = await fetch(
    `${API_BASE}/deposit/depositions/${depId}/actions/publish`,
    {
      method: "POST",
      headers: authHeaders(),
    }
  );
  if (!pubRes.ok) {
    throw new Error(`Zenodo publish failed (${pubRes.status}). ${await readBody(pubRes)}`);
  }
  const published = await pubRes.json();

  const doi: string = published.doi || published?.metadata?.doi || "";
  const conceptDoi: string | null =
    published.conceptdoi || published?.metadata?.conceptdoi || null;
  const recordUrl: string =
    published?.links?.record_html ||
    published?.links?.html ||
    (doi ? `https://doi.org/${doi}` : "");

  if (!doi) {
    throw new Error("Zenodo published the record but returned no DOI.");
  }

  return { doi, recordUrl, conceptDoi, recordId: String(depId) };
}
