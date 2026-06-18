import "server-only";

// Lightweight email sender. Uses Resend (https://resend.com) via its REST API
// when RESEND_API_KEY is configured. If it is not set, emails are logged to the
// server console instead, so local development and a not-yet-configured launch
// keep working without crashing.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || "TerraNova <onboarding@resend.dev>";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Returns the public site origin without a trailing slash. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

/**
 * Sends an email. Never throws: failures are logged and reported via the return
 * value so callers (e.g. moderation) are never broken by a mail outage.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.info(
      `[email] RESEND_API_KEY not set, would send to ${message.to}: ${message.subject}`
    );
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[email] Resend responded ${res.status}: ${detail}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send:", err);
    return false;
  }
}

/** Wraps body content in a simple, consistent HTML shell. */
export function emailLayout(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:28px">
      <h1 style="margin:0 0 16px;font-size:20px;color:#1c1917">${heading}</h1>
      ${bodyHtml}
    </div>
    <p style="margin:20px 4px 0;font-size:12px;color:#a8a29e">
      TerraNova, an open preprint server for the Earth and environmental sciences.
    </p>
  </div></body></html>`;
}
