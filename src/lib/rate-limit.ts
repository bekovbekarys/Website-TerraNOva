import "server-only";

// Simple in-memory fixed-window rate limiter. Suitable for a single-instance
// deployment (as on Railway with one service). If you ever scale to multiple
// instances, swap the store for a shared one (e.g. Redis/Upstash).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  retryAfterSeconds: number;
};

/**
 * Records a hit for `key` and reports whether the caller is within `limit`
 * requests per `windowMs`. Expired buckets are reset lazily.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from common proxy headers (Railway sets these). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

// Opportunistically drop expired buckets so the map cannot grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}, 60_000).unref?.();
