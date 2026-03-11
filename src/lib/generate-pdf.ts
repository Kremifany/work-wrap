import "server-only";

import {
  PDFDocument,
  rgb,
  StandardFonts,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { Business, Job } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
}

const BRAND   = hexToRgb("#1e40af");
const SUCCESS = hexToRgb("#15803d");
const DARK    = hexToRgb("#0f172a");
const MUTED   = hexToRgb("#475569");
const LIGHT   = hexToRgb("#e2e8f0");
const WHITE   = hexToRgb("#ffffff");

interface DrawContext {
  page: PDFPage;
  bold: PDFFont;
  regular: PDFFont;
  y: number;
  margin: number;
  width: number;
}

function drawHRule(ctx: DrawContext) {
  const [r, g, b] = LIGHT;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end:   { x: ctx.width - ctx.margin, y: ctx.y },
    thickness: 0.5,
    color: rgb(r, g, b),
  });
  ctx.y -= 10;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Main generator ─────────────────────────────────────────────────────────

export async function generateJobPDF(
  job: Job,
  business: Business
): Promise<Uint8Array> {
  const pdfDoc    = await PDFDocument.create();
  const bold      = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular   = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pageW     = 595.28; // A4 width in points
  const pageH     = 841.89;
  const margin    = 48;
  const contentW  = pageW - margin * 2;

  let page = pdfDoc.addPage([pageW, pageH]);
  let y    = pageH - margin;

  const ctx: DrawContext = { page, bold, regular, y, margin, width: pageW };

  // ── Header bar ────────────────────────────────────────────────────────────
  const [br, bg, bb] = BRAND;
  page.drawRectangle({
    x: 0, y: pageH - 70,
    width: pageW, height: 70,
    color: rgb(br, bg, bb),
  });

  // Business name in header
  page.drawText(business.name || "FieldProof Report", {
    x: margin, y: pageH - 44,
    size: 18, font: bold,
    color: rgb(...WHITE),
  });
  page.drawText("Job Completion Report", {
    x: margin, y: pageH - 60,
    size: 10, font: regular,
    color: rgb(0.7, 0.8, 1),
  });

  // Business contact (top right)
  const rightX = pageW - margin - 160;
  if (business.phone) {
    page.drawText(business.phone, {
      x: rightX, y: pageH - 40,
      size: 9, font: regular,
      color: rgb(...WHITE),
    });
  }
  if (business.email) {
    page.drawText(business.email, {
      x: rightX, y: pageH - 52,
      size: 9, font: regular,
      color: rgb(...WHITE),
    });
  }

  // ── Logo (if available) ─────────────────────────────────────────────────
  if (business.logoUrl) {
    try {
      const res     = await fetch(business.logoUrl);
      const imgBuf  = await res.arrayBuffer();
      const ct      = res.headers.get("content-type") ?? "";
      const imgEmbed = ct.includes("png")
        ? await pdfDoc.embedPng(imgBuf)
        : await pdfDoc.embedJpg(imgBuf);
      const dim     = imgEmbed.scale(0.06);
      page.drawImage(imgEmbed, {
        x: pageW - margin - dim.width,
        y: pageH - 70 + (70 - dim.height) / 2,
        width:  dim.width,
        height: dim.height,
      });
    } catch {
      // Logo unavailable — skip silently
    }
  }

  y = pageH - 90;
  ctx.y = y;

  // ── Job meta grid ────────────────────────────────────────────────────────
  const metaItems: [string, string][] = [
    ["Date",       new Date(job.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })],
    ["Technician", job.techName],
    ["Job Type",   job.jobType],
    ["Status",     job.status.toUpperCase()],
    ["Customer",   job.customerName],
    ["Address",    job.jobAddress],
  ];
  if (job.customerPhone) metaItems.push(["Customer Phone", job.customerPhone]);
  if (job.customerEmail) metaItems.push(["Customer Email", job.customerEmail]);

  const colW  = contentW / 2;
  let metaY   = y;
  metaItems.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x   = margin + col * colW;
    const ry  = metaY - row * 28;

    page.drawText(label, {
      x, y: ry,
      size: 8, font: regular,
      color: rgb(...MUTED),
    });
    page.drawText(value, {
      x, y: ry - 12,
      size: 10, font: bold,
      color: rgb(...DARK),
    });
  });

  const metaRows = Math.ceil(metaItems.length / 2);
  y = metaY - metaRows * 28 - 16;
  ctx.y = y;

  drawHRule(ctx); y = ctx.y;

  // ── Checklist ────────────────────────────────────────────────────────────
  page.drawText("COMPLETED CHECKLIST", {
    x: margin, y,
    size: 11, font: bold,
    color: rgb(...BRAND),
  });
  y -= 4;
  drawHRule({ ...ctx, y }); y -= 10;
  ctx.y = y;

  for (const item of job.checklist) {
    if (y < margin + 60) {
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
      ctx.page = page;
    }

    const [cr, cg, cb] = item.checked ? SUCCESS : MUTED;
    page.drawText(item.checked ? "✓" : "○", {
      x: margin, y,
      size: 11, font: bold,
      color: rgb(cr, cg, cb),
    });
    page.drawText(item.item, {
      x: margin + 18, y,
      size: 10, font: regular,
      color: rgb(...DARK),
    });
    y -= 18;
  }

  y -= 8;

  // ── Notes ────────────────────────────────────────────────────────────────
  if (job.notes?.trim()) {
    if (y < margin + 80) {
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
      ctx.page = page;
    }
    ctx.y = y;
    drawHRule(ctx); y = ctx.y;

    page.drawText("TECH NOTES", {
      x: margin, y,
      size: 11, font: bold,
      color: rgb(...BRAND),
    });
    y -= 4;
    drawHRule({ ...ctx, y }); y -= 12;
    ctx.y = y;

    const noteLines = wrapText(job.notes, regular, 10, contentW);
    for (const line of noteLines) {
      if (y < margin + 40) {
        page = pdfDoc.addPage([pageW, pageH]);
        y = pageH - margin;
        ctx.page = page;
      }
      page.drawText(line, {
        x: margin, y,
        size: 10, font: regular,
        color: rgb(...DARK),
      });
      y -= 16;
    }
    y -= 8;
  }

  // ── Photos ───────────────────────────────────────────────────────────────
  if (job.photos && job.photos.length > 0) {
    if (y < margin + 120) {
      page = pdfDoc.addPage([pageW, pageH]);
      y = pageH - margin;
      ctx.page = page;
    }
    ctx.y = y;
    drawHRule(ctx); y = ctx.y;

    page.drawText("JOB PHOTOS", {
      x: margin, y,
      size: 11, font: bold,
      color: rgb(...BRAND),
    });
    y -= 4;
    drawHRule({ ...ctx, y }); y -= 16;
    ctx.y = y;

    const photoW    = (contentW - 16) / 2;
    const photoH    = photoW * 0.65;
    const colGap    = 16;
    let   photoCol  = 0;
    let   rowStartY = y;

    for (const photo of job.photos) {
      try {
        if (photoCol === 0 && y - photoH < margin + 40) {
          page = pdfDoc.addPage([pageW, pageH]);
          y = pageH - margin;
          rowStartY = y;
          ctx.page = page;
          page = ctx.page;
        }

        const res   = await fetch(photo.url);
        const buf   = await res.arrayBuffer();
        const ct    = res.headers.get("content-type") ?? "";
        const img   = ct.includes("png")
          ? await pdfDoc.embedPng(buf)
          : await pdfDoc.embedJpg(buf);

        const px = margin + photoCol * (photoW + colGap);
        const py = rowStartY - photoH;

        page.drawImage(img, { x: px, y: py, width: photoW, height: photoH });

        if (photo.caption) {
          page.drawText(photo.caption.slice(0, 60), {
            x: px, y: py - 12,
            size: 8, font: regular,
            color: rgb(...MUTED),
          });
        }

        photoCol++;
        if (photoCol === 2) {
          photoCol    = 0;
          rowStartY  -= photoH + 28;
          y           = rowStartY;
        }
      } catch {
        // Photo fetch failed — skip
      }
    }

    if (photoCol > 0) y = rowStartY - photoH - 28;
  }

  // ── Footer (every page) ──────────────────────────────────────────────────
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const pg = pdfDoc.getPage(i);
    pg.drawText(
      `Report generated by FieldProof  •  ${new Date(job.createdAt).toLocaleDateString()}  •  Page ${i + 1} of ${pageCount}`,
      {
        x: margin,
        y: 28,
        size: 8,
        font: regular,
        color: rgb(...MUTED),
      }
    );
    // Footer line
    pg.drawLine({
      start: { x: margin,      y: 40 },
      end:   { x: pageW - margin, y: 40 },
      thickness: 0.4,
      color: rgb(...LIGHT),
    });
  }

  return pdfDoc.save();
}
