import "server-only";

// Cloudflare Turnstile verification. Turnstile is a free, privacy-friendly
// CAPTCHA alternative. When TURNSTILE_SECRET_KEY is not configured, verification
// is treated as disabled (returns true) so the site works before keys are set.

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

export function turnstileEnabled(): boolean {
  return Boolean(
    TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  );
}

/**
 * Verifies a Turnstile token issued to the browser widget. Returns true when
 * verification passes, or when Turnstile is not configured (disabled).
 */
export async function verifyTurnstile(
  token: unknown,
  ip?: string
): Promise<boolean> {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || token.length === 0) return false;

  try {
    const form = new URLSearchParams();
    form.set("secret", TURNSTILE_SECRET_KEY!);
    form.set("response", token);
    if (ip && ip !== "unknown") form.set("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form }
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification failed:", err);
    return false;
  }
}
