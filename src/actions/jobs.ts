"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { generateJobPDF } from "@/lib/generate-pdf";
import { sendReportEmail } from "@/lib/send-report-email";
import type { ActionResult, ChecklistItem, Job, JobPhoto, JobType } from "@/types";

// ── Plan-limit check ─────────────────────────────────────────────────────────

const JOB_LIMITS: Record<string, number> = { free: 5, pro: Infinity, team: Infinity };

async function checkJobLimit(businessId: string, plan: string): Promise<string | null> {
  const limit = JOB_LIMITS[plan] ?? 5;
  if (limit === Infinity) return null;

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const snap  = await adminDb
    .collection("jobs")
    .where("businessId", "==", businessId)
    .where("createdAt", ">=", start)
    .get();

  if (snap.size >= limit) {
    return `Your ${plan} plan allows ${limit} jobs per month. Please upgrade to continue.`;
  }
  return null;
}

// ── Create draft job ─────────────────────────────────────────────────────────

export interface CreateJobInput {
  techId: string;
  techName: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  jobType: JobType;
  jobAddress: string;
  checklist: ChecklistItem[];
  notes: string;
  photos: JobPhoto[];
}

export async function createJobAction(
  input: CreateJobInput
): Promise<ActionResult<{ jobId: string }>> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "Not authenticated." };
    if (!session.business) return { success: false, error: "Business profile not found." };

    const limitError = await checkJobLimit(session.business.id, session.business.plan);
    if (limitError) return { success: false, error: limitError };

    const now = new Date().toISOString();
    const jobData: Omit<Job, "id"> = {
      businessId: session.business.id,
      ...input,
      pdfUrl: null,
      status: "draft",
      reportSentAt: null,
      createdAt: now,
    };
    const ref = await adminDb.collection("jobs").add(jobData);

    // Update customer job count if linked
    if (input.customerId) {
      await adminDb
        .collection("customers")
        .doc(input.customerId)
        .update({ jobCount: FieldValue.increment(1) });
    }

    revalidatePath("/jobs");
    return { success: true, data: { jobId: ref.id } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create job.";
    return { success: false, error: msg };
  }
}

// ── Complete job + generate PDF + email ──────────────────────────────────────

export async function completeJobAction(
  jobId: string,
  updates: Partial<Pick<Job, "checklist" | "notes" | "photos">>
): Promise<ActionResult<{ pdfUrl: string }>> {
  try {
    const session = await getSession();
    if (!session || !session.business) return { success: false, error: "Not authenticated." };

    const jobRef  = adminDb.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) return { success: false, error: "Job not found." };

    const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
    if (job.businessId !== session.business.id) {
      return { success: false, error: "Access denied." };
    }

    // Merge any last-minute updates
    const finalJob: Job = {
      ...job,
      ...(updates.checklist !== undefined && { checklist: updates.checklist }),
      ...(updates.notes     !== undefined && { notes: updates.notes }),
      ...(updates.photos    !== undefined && { photos: updates.photos }),
    };

    const business = session.business;

    // Generate PDF
    const pdfBytes = await generateJobPDF(finalJob, business);

    // Upload PDF to Firebase Storage
    const bucket   = adminStorage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const filePath = `reports/${business.id}/${jobId}/report.pdf`;
    const file     = bucket.file(filePath);
    await file.save(Buffer.from(pdfBytes), {
      contentType: "application/pdf",
      resumable:   false,
    });
    await file.makePublic();
    const pdfUrl = file.publicUrl();

    // Send email
    if (finalJob.customerEmail) {
      await sendReportEmail({ job: finalJob, business, pdfBuffer: pdfBytes });
    }

    // Persist to Firestore
    const completedAt = new Date().toISOString();
    await jobRef.update({
      ...(updates.checklist !== undefined && { checklist: updates.checklist }),
      ...(updates.notes     !== undefined && { notes: updates.notes }),
      ...(updates.photos    !== undefined && { photos: updates.photos }),
      status:        "completed",
      pdfUrl,
      reportSentAt:  finalJob.customerEmail ? completedAt : null,
    });

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    return { success: true, data: { pdfUrl } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to complete job.";
    return { success: false, error: msg };
  }
}

// ── Resend report ────────────────────────────────────────────────────────────

export async function resendReportAction(jobId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session || !session.business) return { success: false, error: "Not authenticated." };

    const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) return { success: false, error: "Job not found." };

    const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
    if (job.businessId !== session.business.id) return { success: false, error: "Access denied." };
    if (!job.customerEmail) return { success: false, error: "No customer email on file." };

    const business = session.business;
    const pdfBytes = await generateJobPDF(job, business);
    await sendReportEmail({ job, business, pdfBuffer: pdfBytes });

    await adminDb.collection("jobs").doc(jobId).update({
      reportSentAt: new Date().toISOString(),
    });

    revalidatePath(`/jobs/${jobId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resend report.";
    return { success: false, error: msg };
  }
}

// ── Delete job ───────────────────────────────────────────────────────────────

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session || !session.business) return { success: false, error: "Not authenticated." };

    const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) return { success: false, error: "Job not found." };

    const job = jobSnap.data() as Omit<Job, "id">;
    if (job.businessId !== session.business.id) return { success: false, error: "Access denied." };

    await adminDb.collection("jobs").doc(jobId).delete();
    revalidatePath("/jobs");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete job.";
    return { success: false, error: msg };
  }
}

