/**
 * Detect image type from magic bytes (do not trust client Content-Type / extension).
 */
export type DetectedImageType = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

function startsWith(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

/** HEIC/HEIF: ISO BMFF with `ftyp` and a heic/heif-related brand. */
function isHeicFamily(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  if (buf.toString("ascii", 4, 8) !== "ftyp") return false;
  const brand = buf.toString("ascii", 8, 12).toLowerCase();
  const heicBrands = new Set([
    "heic",
    "heix",
    "hevc",
    "hevx",
    "heim",
    "heis",
    "hevm",
    "hevs",
    "mif1",
    "msf1",
    "heif",
  ]);
  if (heicBrands.has(brand)) return true;
  // Also scan compatible brands in the ftyp box (first ~64 bytes)
  const probe = buf.subarray(8, Math.min(buf.length, 64)).toString("ascii").toLowerCase();
  return ["heic", "heif", "mif1", "msf1"].some((b) => probe.includes(b));
}

export function detectImageMime(buf: Buffer): DetectedImageType | null {
  // JPEG
  if (startsWith(buf, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // PNG
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (isHeicFamily(buf)) return "image/heic";

  return null;
}

/** Safe storage basename — no user-controlled path segments. */
export function safeUploadBasename(originalName: string, mime: DetectedImageType): string {
  const ext =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : "heic";
  const base = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 40);
  return `${base || "photo"}.${ext}`;
}

/** Caption from filename only (display); never used in storage paths. */
export function captionFromFilename(originalName: string): string {
  return originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9 ._()-]/g, " ")
    .trim()
    .slice(0, 100);
}
