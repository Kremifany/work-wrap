import "server-only";

import { headers } from "next/headers";

/**
 * Use Secure cookies only on real HTTPS.
 * localhost / LAN IPs (phone testing via http://192.168.x.x) must stay non-Secure
 * or the browser silently drops the session cookie after login.
 */
export async function sessionCookieSecure(): Promise<boolean> {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0]?.trim();
  if (proto === "https") return true;
  if (proto === "http") return false;

  const host = (h.get("host") ?? "").toLowerCase();
  if (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(host)
  ) {
    return false;
  }

  return process.env.NODE_ENV === "production";
}

export async function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: await sessionCookieSecure(),
    sameSite: "lax" as const,
    maxAge: maxAgeSeconds,
    path: "/",
  };
}
