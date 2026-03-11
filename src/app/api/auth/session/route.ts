import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 10 auth attempts per minute per IP
  if (!rateLimit(`auth-session:${ip}`, 10, 60_000)) {
    logger.warn("Rate limit exceeded on auth session", { ip });
    return NextResponse.json({ error: "Too many requests. Please wait and try again." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => null);
    const idToken = body?.idToken;
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
    }

    // Verify the ID token
    const decoded = await adminAuth.verifyIdToken(idToken);

    // Create a 5-day session cookie
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("__session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    logger.info("Session created", { uid: decoded.uid });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Session creation failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("__session");
  return NextResponse.json({ ok: true });
}
