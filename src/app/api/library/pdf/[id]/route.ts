import { getPaper } from "@/lib/library";

export const dynamic = "force-dynamic";

// Streams a library paper's open-access PDF from the publisher so it can be
// read inside TerraNova. Many publishers block their PDFs from being embedded
// directly in another site; serving it from our own address avoids that. If the
// publisher doesn't hand back a real PDF, a small page links to it instead.

const MAX_BYTES = 60 * 1024 * 1024;

function isPublicHost(url: URL) {
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  if (h.startsWith("[")) return false; // IPv6 literals
  return true;
}

function fallback(title: string, links: { label: string; href: string }[]) {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const buttons = links
    .map((l, i) => `<a class="${i === 0 ? "p" : "s"}" href="${esc(l.href)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`)
    .join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f5f4;font-family:system-ui,-apple-system,sans-serif;color:#292524}
.c{max-width:460px;margin:24px;padding:36px 32px;background:#fff;border:1px solid #e7e5e4;border-radius:20px;box-shadow:0 2px 20px -4px rgba(20,61,44,.12);text-align:center}
.i{width:56px;height:56px;margin:0 auto 18px;border-radius:16px;background:#dbf0e3;display:grid;place-items:center;color:#1f744c}
h1{font-family:Georgia,serif;font-size:21px;margin:0 0 10px}p{margin:0 0 22px;color:#57534e;line-height:1.6;font-size:15px}
a{display:inline-block;margin:4px;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px;text-decoration:none}
a.p{background:#1f744c;color:#fff}a.s{border:1px solid #d6d3d1;color:#44403c}
</style></head><body><div class="c"><div class="i"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5V5.5ZM12 6v13.5"/></svg></div>
<h1>Read this paper at the publisher</h1><p>The publisher doesn't allow this paper to be displayed inside other websites. It's still free to read: open it in a new tab below.</p>${buttons}</div></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const paper = await getPaper(params.id);
  if (!paper) return new Response("Not found", { status: 404 });

  const links = [
    ...(paper.pdfUrl ? [{ label: "Open the PDF", href: paper.pdfUrl }] : []),
    ...(paper.landingUrl ? [{ label: "View at publisher", href: paper.landingUrl }] : []),
  ];
  if (!paper.pdfUrl) return fallback(paper.title, links);

  let target: URL;
  try {
    target = new URL(paper.pdfUrl);
  } catch {
    return fallback(paper.title, links);
  }
  if (!isPublicHost(target)) return fallback(paper.title, links);

  try {
    const res = await fetch(target, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; TerraNovaLibrary/1.0; +https://github.com/bekovbekarys/website-terranova)",
        Accept: "application/pdf,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok || !res.body) return fallback(paper.title, links);
    const declared = Number(res.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) return fallback(paper.title, links);

    // Check the first bytes really are a PDF before passing them on.
    const reader = res.body.getReader();
    const head: Uint8Array[] = [];
    let headLen = 0;
    while (headLen < 5) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      head.push(value);
      headLen += value.length;
    }
    const first = new Uint8Array(headLen);
    let off = 0;
    for (const chunk of head) {
      first.set(chunk, off);
      off += chunk.length;
    }
    const magic = new TextDecoder().decode(first.slice(0, 1024));
    if (!magic.includes("%PDF")) {
      reader.cancel().catch(() => {});
      return fallback(paper.title, links);
    }

    let sent = first.length;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(first);
      },
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) return controller.close();
        sent += value.length;
        if (sent > MAX_BYTES) {
          reader.cancel().catch(() => {});
          return controller.error(new Error("PDF too large"));
        }
        controller.enqueue(value);
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${paper.id}.pdf"`,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return fallback(paper.title, links);
  }
}
