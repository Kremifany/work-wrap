import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth-session";
import { adminStorage } from "@/lib/firebase-admin";
import { serverEnv } from "@/lib/env.server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  captionFromFilename,
  detectImageMime,
  safeUploadBasename,
} from "@/lib/upload-image";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_PREFIXES = new Set(["before", "after", "general"]);

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const session = await getSession();
  if (!session?.business?.id) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // 30 uploads / minute per user (fallback to IP)
  const rateKey = `upload-job-photo:${session.user.uid || ip}`;
  if (!rateLimit(rateKey, 30, 60_000)) {
    logger.warn("Rate limit exceeded on job photo upload", {
      uid: session.user.uid,
      ip,
    });
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  const prefixRaw = String(form.get("prefix") ?? "general");
  const prefix = ALLOWED_PREFIXES.has(prefixRaw) ? prefixRaw : "general";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max 15 MB per photo." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large. Max 15 MB per photo." },
      { status: 400 }
    );
  }

  const detected = detectImageMime(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "File is not a valid JPEG, PNG, WebP, or HEIC image." },
      { status: 400 }
    );
  }

  // Ignore client MIME / extension — we set Content-Type from magic bytes only.
  const businessId = session.business.id;
  const basename = safeUploadBasename(file.name || "photo", detected);
  const objectPath = `businesses/${businessId}/jobs/${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}_${basename}`;

  try {
    const bucket = adminStorage.bucket(serverEnv.FIREBASE_STORAGE_BUCKET);
    const object = bucket.file(objectPath);

    await object.save(buffer, {
      resumable: false,
      // Forced server-side type — never trust the browser Content-Type
      contentType: detected,
      metadata: {
        cacheControl: "public, max-age=31536000",
        contentDisposition: `inline; filename="${basename.replace(/["\\\r\n]/g, "")}"`,
        metadata: {
          uploadedBy: session.user.uid,
          businessId,
          prefix,
        },
      },
    });
    await object.makePublic();

    return NextResponse.json({
      url: object.publicUrl(),
      caption: captionFromFilename(file.name || basename),
    });
  } catch (err) {
    logger.error("Job photo upload failed", {
      uid: session.user.uid,
      businessId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
