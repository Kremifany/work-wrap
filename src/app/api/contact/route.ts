import { type NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env.server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";

const resend = new Resend(serverEnv.RESEND_API_KEY);

const contactSchema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email().max(200),
  phone:   z.string().max(30).optional().default(""),
  subject: z.string().min(1).max(200),
  message: z.string().min(10).max(5000),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 5 contact form submissions per 10 minutes per IP
  if (!rateLimit(`contact:${ip}`, 5, 10 * 60_000)) {
    logger.warn("Rate limit exceeded on contact form", { ip });
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please fill in all required fields correctly." },
      { status: 400 }
    );
  }

  const { name, email, phone, subject, message } = parsed.data;

  // Sanitize — strip < > to prevent HTML injection in email
  const safe = (s: string) => s.replace(/[<>]/g, "");

  try {
    await resend.emails.send({
      from:    "Job Tracker Pro Support Form <noreply@jobtrackerproapp.com>",
      to:      ["support@cliplogicpro.com"],
      replyTo: email,
      subject: `[Job Tracker Pro Support] ${safe(subject)}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e3a8a;margin-bottom:16px;">New Support Request</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:8px 0;color:#64748b;width:110px;"><strong>Name</strong></td><td style="padding:8px 0;">${safe(name)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;"><strong>Email</strong></td><td style="padding:8px 0;">${safe(email)}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;"><strong>Phone</strong></td><td style="padding:8px 0;">${safe(phone) || "—"}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;"><strong>Subject</strong></td><td style="padding:8px 0;">${safe(subject)}</td></tr>
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>
          <p style="color:#334155;line-height:1.6;white-space:pre-wrap;">${safe(message)}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;"/>
          <p style="font-size:12px;color:#94a3b8;">Sent from the Job Tracker Pro contact form. Reply-To: ${safe(email)}</p>
        </div>
      `,
    });

    logger.info("Contact form submitted", { name: safe(name), subject: safe(subject) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("Contact form email failed", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "Failed to send your message. Please try again later." },
      { status: 500 }
    );
  }
}
