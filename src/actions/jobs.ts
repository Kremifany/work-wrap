"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { generateJobPDF } from "@/lib/generate-pdf";
import { sendReportEmail } from "@/lib/send-report-email";
import { normalizeJob } from "@/lib/job-utils";
import {
  createJobSchema,
  completeJobUpdatesSchema,
  updateJobSchema,
} from "@/lib/schemas";
import type { ActionResult, ChecklistItem, Job, JobPhoto, JobType } from "@/types";

// ── Plan-limit check ─────────────────────────────────────────────────────────

const JOB_LIMITS: Record<string, number> = { free: 5, pro: Infinity, team: Infinity };

async function checkJobLimit(businessId: string, plan: string): Promise<string | null> {
  const limit = JOB_LIMITS[plan] ?? 5;
  if (limit === Infinity) return null;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const snap = await adminDb
    .collection("jobs")
    .where("businessId", "==", businessId)
    .get();

  const count = snap.docs.filter((d) => {
    const createdAt = d.data().createdAt as string | undefined;
    return createdAt != null && createdAt >= start;
  }).length;

  if (count >= limit) {
    return `Your ${plan} plan allows ${limit} jobs per month. Please upgrade to continue.`;
  }
  return null;
}

async function loadOwnedJob(jobId: string, businessId: string): Promise<Job | null> {
  const jobSnap = await adminDb.collection("jobs").doc(jobId).get();
  if (!jobSnap.exists) return null;
  const job = normalizeJob({ id: jobSnap.id, ...jobSnap.data() } as Job);
  if (job.businessId !== businessId) return null;
  return job;
}

async function savePdfToStorage(
  businessId: string,
  jobId: string,
  pdfBytes: Uint8Array
): Promise<string> {
  const bucket = adminStorage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
  const filePath = `reports/${businessId}/${jobId}/report.pdf`;
  const file = bucket.file(filePath);
  await file.save(Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    resumable: false,
  });
  await file.makePublic();
  return file.publicUrl();
}

function buildJobPayload(input: {
  title: string;
  jobType?: JobType;
  checklist?: ChecklistItem[];
  notes: string;
  beforePhotos: JobPhoto[];
  afterPhotos: JobPhoto[];
  photos?: JobPhoto[];
}) {
  const beforePhotos = input.beforePhotos;
  const afterPhotos = input.afterPhotos;
  return {
    title: input.title,
    jobType: input.jobType ?? "General",
    checklist: input.checklist ?? [],
    notes: input.notes,
    beforePhotos,
    afterPhotos,
    photos: input.photos ?? [...beforePhotos, ...afterPhotos],
  };
}

// ── Create draft job ─────────────────────────────────────────────────────────

export interface CreateJobInput {
  techId: string;
  techName: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  title: string;
  jobType?: JobType;
  jobAddress: string;
  checklist?: ChecklistItem[];
  notes: string;
  beforePhotos: JobPhoto[];
  afterPhotos: JobPhoto[];
}

export async function createJobAction(
  input: CreateJobInput
): Promise<ActionResult<{ jobId: string }>> {
  try {
    const parsed = createJobSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    const session = await getSession();
    if (!session) return { success: false, error: "Not authenticated." };
    if (!session.business) return { success: false, error: "Business profile not found." };

    const limitError = await checkJobLimit(session.business.id, session.business.plan);
    if (limitError) return { success: false, error: limitError };

    const now = new Date().toISOString();
    const jobData: Omit<Job, "id"> = {
      businessId: session.business.id,
      techId: input.techId,
      techName: input.techName,
      customerId: input.customerId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      jobAddress: input.jobAddress,
      ...buildJobPayload(input),
      pdfUrl: null,
      status: "draft",
      completedAt: null,
      reportSentAt: null,
      createdAt: now,
    };
    const ref = await adminDb.collection("jobs").add(jobData);

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

// ── Update draft job ─────────────────────────────────────────────────────────

export async function updateJobAction(
  jobId: string,
  updates: Partial<
    Pick<Job, "title" | "jobAddress" | "checklist" | "notes" | "beforePhotos" | "afterPhotos">
  >
): Promise<ActionResult> {
  try {
    const parsed = updateJobSchema.safeParse(updates);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid updates." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const job = await loadOwnedJob(jobId, session.business.id);
    if (!job) return { success: false, error: "Job not found." };
    if (job.status === "completed") {
      return { success: false, error: "Completed jobs cannot be edited." };
    }

    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.jobAddress !== undefined) patch.jobAddress = updates.jobAddress;
    if (updates.checklist !== undefined) patch.checklist = updates.checklist;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.beforePhotos !== undefined) {
      patch.beforePhotos = updates.beforePhotos;
      patch.photos = [
        ...updates.beforePhotos,
        ...(updates.afterPhotos ?? job.afterPhotos ?? []),
      ];
    }
    if (updates.afterPhotos !== undefined) {
      patch.afterPhotos = updates.afterPhotos;
      patch.photos = [
        ...(updates.beforePhotos ?? job.beforePhotos ?? []),
        ...updates.afterPhotos,
      ];
    }

    await adminDb.collection("jobs").doc(jobId).update(patch);
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update job.";
    return { success: false, error: msg };
  }
}

// ── Generate PDF (no email) ──────────────────────────────────────────────────

export async function generateReportAction(
  jobId: string,
  updates: Partial<Pick<Job, "checklist" | "notes" | "beforePhotos" | "afterPhotos">> = {}
): Promise<ActionResult<{ pdfUrl: string }>> {
  try {
    const parsed = completeJobUpdatesSchema.safeParse(updates);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid updates." };
    }

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const job = await loadOwnedJob(jobId, session.business.id);
    if (!job) return { success: false, error: "Job not found." };

    const finalJob = normalizeJob({
      ...job,
      ...(updates.checklist !== undefined && { checklist: updates.checklist }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.beforePhotos !== undefined && { beforePhotos: updates.beforePhotos }),
      ...(updates.afterPhotos !== undefined && { afterPhotos: updates.afterPhotos }),
    });

    if (updates.checklist !== undefined) await adminDb.collection("jobs").doc(jobId).update({ checklist: updates.checklist });
    if (updates.notes !== undefined) await adminDb.collection("jobs").doc(jobId).update({ notes: updates.notes });
    if (updates.beforePhotos !== undefined || updates.afterPhotos !== undefined) {
      await adminDb.collection("jobs").doc(jobId).update({
        beforePhotos: finalJob.beforePhotos,
        afterPhotos: finalJob.afterPhotos,
        photos: finalJob.photos,
      });
    }

    const pdfBytes = await generateJobPDF(finalJob, session.business);
    const pdfUrl = await savePdfToStorage(session.business.id, jobId, pdfBytes);

    await adminDb.collection("jobs").doc(jobId).update({ pdfUrl });

    revalidatePath(`/jobs/${jobId}`);
    return { success: true, data: { pdfUrl } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate report.";
    return { success: false, error: msg };
  }
}

// ── Send report email ────────────────────────────────────────────────────────

export async function sendReportAction(jobId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const job = await loadOwnedJob(jobId, session.business.id);
    if (!job) return { success: false, error: "Job not found." };
    if (!job.customerEmail) return { success: false, error: "No customer email on file." };

    const business = session.business;
    const pdfBytes = await generateJobPDF(job, business);
    await sendReportEmail({ job, business, pdfBuffer: pdfBytes });

    const sentAt = new Date().toISOString();
    await adminDb.collection("jobs").doc(jobId).update({
      reportSentAt: sentAt,
      status: "completed",
      completedAt: job.completedAt ?? sentAt,
      pdfUrl: job.pdfUrl ?? (await savePdfToStorage(business.id, jobId, pdfBytes)),
    });

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send report.";
    return { success: false, error: msg };
  }
}

// ── Complete job + generate PDF + email (one-click) ──────────────────────────

export async function completeJobAction(
  jobId: string,
  updates: Partial<Pick<Job, "checklist" | "notes" | "beforePhotos" | "afterPhotos">> = {}
): Promise<ActionResult<{ pdfUrl: string }>> {
  try {
    const genResult = await generateReportAction(jobId, updates);
    if (!genResult.success) return genResult;

    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const job = await loadOwnedJob(jobId, session.business.id);
    if (!job) return { success: false, error: "Job not found." };

    if (job.customerEmail) {
      const pdfBytes = await generateJobPDF(job, session.business);
      await sendReportEmail({ job, business: session.business, pdfBuffer: pdfBytes });
      const completedAt = new Date().toISOString();
      await adminDb.collection("jobs").doc(jobId).update({
        status: "completed",
        completedAt,
        reportSentAt: completedAt,
      });
    } else {
      await adminDb.collection("jobs").doc(jobId).update({
        status: "completed",
        completedAt: new Date().toISOString(),
      });
    }

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    return genResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to complete job.";
    return { success: false, error: msg };
  }
}

// ── Resend report ────────────────────────────────────────────────────────────

export async function resendReportAction(jobId: string): Promise<ActionResult> {
  return sendReportAction(jobId);
}

// ── Delete job ───────────────────────────────────────────────────────────────

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

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
