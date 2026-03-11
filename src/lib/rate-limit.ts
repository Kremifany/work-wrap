/**
 * Simple in-memory rate limiter.
 * Suitable for single-instance (dev/Vercel serverless with cold-start awareness).
 * For multi-instance production, swap the store for Redis/Upstash.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Clean up expired windows every 5 minutes to avoid memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, win] of store.entries()) {
    if (win.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Returns true if the request should be allowed, false if it exceeds the limit.
 * @param key       A unique identifier (e.g. IP + route)
 * @param limit     Max requests allowed in the window
 * @param windowMs  Window size in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const win = store.get(key);

  if (!win || win.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (win.count >= limit) return false;

  win.count += 1;
  return true;
}

/** Extract the real client IP from Next.js request headers. */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
