import "server-only";

import { Resend } from "resend";
import { serverEnv } from "./env.server";
import { logger } from "./logger";
import { getCompletedDate, getJobTitle, getReportFilename } from "@/lib/job-utils";
import type { Business, Job } from "@/types";

const resend = new Resend(serverEnv.RESEND_API_KEY);

interface SendReportEmailOptions {
  job: Job;
  business: Business;
  pdfBuffer: Uint8Array;
}

function formatFromAddress(businessName: string): string {
  const safeName = businessName.replace(/[<>"]/g, "").trim() || "Job Tracker";
  const match = serverEnv.RESEND_FROM.match(/<([^>]+)>/);
  const email = match?.[1] ?? serverEnv.RESEND_FROM;
  return `${safeName} via Job Tracker <${email}>`;
}

export async function sendReportEmail({
  job,
  business,
  pdfBuffer,
}: SendReportEmailOptions): Promise<void> {
  const jobTitle = getJobTitle(job);
  const dateStr = getCompletedDate(job);
  const filename = getReportFilename(job);
  const to = job.customerEmail?.trim().toLowerCase();

  if (!to) {
    throw new Error("No customer email on file.");
  }

  const fromAddress = formatFromAddress(business.name);
  const subject = `Your inspection report — ${jobTitle}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#1E5AA8;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${business.name}</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Inspection Report Ready</p>
    </div>
    <div style="padding:32px;">
      <p style="margin:0 0 16px;font-size:16px;color:#333;">
        Hi ${job.customerName},
      </p>
      <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
        Your inspection report for <strong>${jobTitle}</strong> at ${job.jobAddress || "your property"} is attached.
        It includes before and after photos plus a summary of the work completed on ${dateStr}.
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#475569;width:140px;">Job</td>
            <td style="padding:6px 0;color:#333;font-weight:500;">${jobTitle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Address</td>
            <td style="padding:6px 0;color:#333;font-weight:500;">${job.jobAddress || "—"}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Date completed</td>
            <td style="padding:6px 0;color:#333;font-weight:500;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#475569;">Prepared by</td>
            <td style="padding:6px 0;color:#333;font-weight:500;">${business.name}</td>
          </tr>
        </table>
      </div>
      ${
        business.googleReviewUrl
          ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
               If you're happy with our work, we'd appreciate a review:
               <a href="${business.googleReviewUrl}" style="color:#1E5AA8;">Leave a Google review</a>.
             </p>`
          : ""
      }
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
        Questions? Contact ${business.name}${
          business.phone
            ? ` at <a href="tel:${business.phone}" style="color:#1E5AA8;">${business.phone}</a>`
            : business.email
              ? ` at <a href="mailto:${business.email}" style="color:#1E5AA8;">${business.email}</a>`
              : ""
        }.
      </p>
    </div>
    <div style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#94a3b8;">
        Sent via
        <a href="${serverEnv.NEXT_PUBLIC_APP_URL}" style="color:#1E5AA8;">Job Tracker</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBuffer).toString("base64"),
        contentType: "application/pdf",
      },
    ],
  });

  if (error) {
    logger.error("Resend report email failed", {
      to,
      from: fromAddress,
      error: error.message,
      name: error.name,
    });
    throw new Error(
      error.message ||
        "Email provider rejected the message. Check Resend domain verification and sender settings."
    );
  }

  logger.info("Report email sent", { to, messageId: data?.id });
}
