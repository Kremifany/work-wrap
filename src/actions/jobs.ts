"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { getSession } from "@/lib/auth-session";
import { generateJobPDF } from "@/lib/generate-pdf";
import { sendReportEmail } from "@/lib/send-report-email";
import { normalizeJob, getReportFilename, canEditJob } from "@/lib/job-utils";
import {
  logJobCompletedInteraction,
  logJobCreatedInteraction,
  logReportEmailedInteraction,
} from "@/lib/interactions";
import { describeJobUpdates, recordJobChanges } from "@/lib/job-changes"; 
import {
  createJobSchema,
  completeJobUpdatesSchema,
  updateJobSchema,
} from "@/lib/schemas";
import type { ActionResult, ChecklistItem, Job, JobAssignedTech, JobPhoto, JobType, SessionContext } from "@/types";

// ── Plan-limit check ─────────────────────────────────────────────────────────

const JOB_LIMITS: Record<string, number> = { free: 5, pro: Infinity, team: Infinity };

function denyUnlessCanEdit(
  session: SessionContext,
  job: Job
): { success: false; error: string } | null {
  if (!canEditJob(session, job)) {
    return {
      success: false,
      error: "Only the business owner or technicians assigned to this job can edit it.",
    };
  }
  return null;
}

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

/**
 * Customer CRM is the source of truth for contact email/phone/name.
 * Jobs only copy those fields for display/PDF; many jobs share one customer email.
 */
async function resolveJobWithCustomerContact(job: Job): Promise<Job> {
  if (!job.customerId) return job;

  const snap = await adminDb.collection("customers").doc(job.customerId).get();
  if (!snap.exists) return job;

  const customer = snap.data() as {
    businessId?: string;
    email?: string;
    phone?: string;
    name?: string;
  };
  if (customer.businessId !== job.businessId) return job;

  const email = (customer.email ?? "").trim();
  const phone = (customer.phone ?? "").trim();
  const name = (customer.name ?? "").trim();

  const patch: Record<string, string> = {};
  if (email && email !== (job.customerEmail ?? "").trim()) patch.customerEmail = email;
  if (phone && phone !== (job.customerPhone ?? "").trim()) patch.customerPhone = phone;
  if (name && name !== (job.customerName ?? "").trim()) patch.customerName = name;

  if (Object.keys(patch).length > 0) {
    await adminDb.collection("jobs").doc(job.id).update(patch);
  }

  return {
    ...job,
    customerEmail: email || job.customerEmail,
    customerPhone: phone || job.customerPhone,
    customerName: name || job.customerName,
  };
}

async function savePdfToStorage(
  businessId: string,
  jobId: string,
  pdfBytes: Uint8Array,
  filename: string
): Promise<string> {
  const bucket = adminStorage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
  const filePath = `reports/${businessId}/${jobId}/report.pdf`;
  const file = bucket.file(filePath);
  const safeName = filename.replace(/["\\\r\n]/g, "") || "work-wrap-report.pdf";
  await file.save(Buffer.from(pdfBytes), {
    contentType: "application/pdf",
    resumable: false,
    metadata: {
      contentDisposition: `inline; filename="${safeName}"`,
    },
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
  draftKey: string;
  techId: string;
  techName: string;
  techs: JobAssignedTech[];
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

    const techs =
      session.role === "tech" && session.tech
        ? [{ id: session.tech.id, name: session.tech.name }]
        : parsed.data.techs;
    const primary = techs[0];
    const draftKey = parsed.data.draftKey;
    const ref = adminDb.collection("jobs").doc(draftKey);

    const existing = await ref.get();
    if (existing.exists) {
      if (existing.data()?.businessId !== session.business.id) {
        return { success: false, error: "Could not save this job. Please try again." };
      }
      return { success: true, data: { jobId: ref.id } };
    }

    const limitError = await checkJobLimit(session.business.id, session.business.plan);
    if (limitError) return { success: false, error: limitError };

    const now = new Date().toISOString();
    const jobData: Omit<Job, "id"> = {
      businessId: session.business.id,
      techId: primary.id,
      techName: primary.name,
      techs,
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
      draftKey,
    };
    try {
      await ref.create(jobData);
    } catch (err) {
      const code = (err as { code?: number | string }).code;
      const alreadyExists = code === 6 || code === "already-exists" || code === "ALREADY_EXISTS";
      if (!alreadyExists) throw err;
      const raced = await ref.get();
      if (!raced.exists || raced.data()?.businessId !== session.business.id) {
        return { success: false, error: "Could not save this job. Please try again." };
      }
      return { success: true, data: { jobId: ref.id } };
    }

    if (input.customerId) {
      await adminDb
        .collection("customers")
        .doc(input.customerId)
        .update({ jobCount: FieldValue.increment(1) });
      await logJobCreatedInteraction(
        session,
        { id: ref.id, ...jobData },
        session.business.id
      );
    }
    await recordJobChanges(session, { id: ref.id, ...jobData }, ["Created this job"]);

    revalidatePath("/jobs");
    if (input.customerId) revalidatePath(`/customers/${input.customerId}`);
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
    Pick<
      Job,
      | "title"
      | "jobAddress"
      | "checklist"
      | "notes"
      | "beforePhotos"
      | "afterPhotos"
      | "techs"
      | "customerId"
      | "customerName"
      | "customerEmail"
      | "customerPhone"
    >
  >,
  options?: { revalidate?: boolean }
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
    const denied = denyUnlessCanEdit(session, job);
    if (denied) return denied;
    if (job.status === "completed") {
      return { success: false, error: "Completed jobs cannot be edited." };
    }

    const patch: Record<string, unknown> = {};
    if (updates.title !== undefined) patch.title = updates.title;
    if (updates.jobAddress !== undefined) patch.jobAddress = updates.jobAddress;
    if (updates.checklist !== undefined) patch.checklist = updates.checklist;
    if (updates.notes !== undefined) patch.notes = updates.notes;
    if (updates.customerId !== undefined) patch.customerId = updates.customerId;
    if (updates.customerName !== undefined) patch.customerName = updates.customerName;
    if (updates.customerEmail !== undefined) patch.customerEmail = updates.customerEmail;
    if (updates.customerPhone !== undefined) patch.customerPhone = updates.customerPhone;
    if (session.role !== "tech" && updates.techs !== undefined) {
      const techs = updates.techs;
      patch.techs = techs;
      patch.techId = techs[0]?.id ?? "";
      patch.techName = techs[0]?.name ?? "";
    }
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

    // If customer changed, adjust jobCount on old/new customers
    if (
      updates.customerId !== undefined &&
      updates.customerId &&
      updates.customerId !== job.customerId
    ) {
      const custSnap = await adminDb.collection("customers").doc(updates.customerId).get();
      if (!custSnap.exists || custSnap.data()?.businessId !== session.business.id) {
        return { success: false, error: "Customer not found." };
      }
    }

    await adminDb.collection("jobs").doc(jobId).update(patch);
    const recordedUpdates =
      session.role === "tech" ? { ...updates, techs: undefined } : updates;
    await recordJobChanges(session, job, describeJobUpdates(job, recordedUpdates));

    if (
      updates.customerId !== undefined &&
      updates.customerId !== job.customerId
    ) {
      if (job.customerId) {
        await adminDb
          .collection("customers")
          .doc(job.customerId)
          .update({ jobCount: FieldValue.increment(-1) });
      }
      if (updates.customerId) {
        await adminDb
          .collection("customers")
          .doc(updates.customerId)
          .update({ jobCount: FieldValue.increment(1) });
      }
    }

    // Autosave passes revalidate:false to avoid remount loops on the job page.
    if (options?.revalidate !== false) {
      revalidatePath(`/jobs/${jobId}`);
      revalidatePath("/jobs");
      if (job.customerId) revalidatePath(`/customers/${job.customerId}`);
      if (updates.customerId && updates.customerId !== job.customerId) {
        revalidatePath(`/customers/${updates.customerId}`);
      }
    }
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
    const denied = denyUnlessCanEdit(session, job);
    if (denied) return denied;

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
    const pdfUrl = await savePdfToStorage(
      session.business.id,
      jobId,
      pdfBytes,
      getReportFilename(finalJob)
    );

    await adminDb.collection("jobs").doc(jobId).update({ pdfUrl });
    await recordJobChanges(session, job, [
      ...describeJobUpdates(job, updates),
      "Generated the job report",
    ]);

    revalidatePath(`/jobs/${jobId}`);
    return { success: true, data: { pdfUrl } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to generate report.";
    return { success: false, error: msg };
  }
}

// ── Send report email ────────────────────────────────────────────────────────

export async function sendReportAction(
  jobId: string
): Promise<ActionResult<{ emailedTo: string }>> {
  try {
    const session = await getSession();
    if (!session?.business) return { success: false, error: "Not authenticated." };

    const loaded = await loadOwnedJob(jobId, session.business.id);
    if (!loaded) return { success: false, error: "Job not found." };
    const denied = denyUnlessCanEdit(session, loaded);
    if (denied) return denied;

    // Prefer CRM customer email (one per customer) over stale job snapshot
    const job = await resolveJobWithCustomerContact(loaded);
    if (!job.customerEmail?.trim()) {
      return { success: false, error: "No customer email on file. Update the customer in CRM." };
    }

    const business = session.business;
    const pdfBytes = await generateJobPDF(job, business);
    await sendReportEmail({ job, business, pdfBuffer: pdfBytes });

    const sentAt = new Date().toISOString();
    const wasCompleted = job.status === "completed";
    await adminDb.collection("jobs").doc(jobId).update({
      reportSentAt: sentAt,
      status: "completed",
      completedAt: job.completedAt ?? sentAt,
      pdfUrl: job.pdfUrl ?? (await savePdfToStorage(business.id, jobId, pdfBytes, getReportFilename(job))),
    });

    await logReportEmailedInteraction(
      session,
      job,
      business.id,
      job.customerEmail.trim()
    );
    if (!wasCompleted) {
      await logJobCompletedInteraction(session, job, business.id);
    }
    await recordJobChanges(session, job, [
      `Sent the report to ${job.customerEmail.trim()}`,
      ...(!wasCompleted ? ["Marked the job complete"] : []),
    ]);

    revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/jobs");
    if (job.customerId) revalidatePath(`/customers/${job.customerId}`);
    return { success: true, data: { emailedTo: job.customerEmail.trim() } };
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

    const loaded = await loadOwnedJob(jobId, session.business.id);
    if (!loaded) return { success: false, error: "Job not found." };
    const denied = denyUnlessCanEdit(session, loaded);
    if (denied) return denied;

    const job = await resolveJobWithCustomerContact(loaded);
    const wasCompleted = job.status === "completed";

    if (job.customerEmail?.trim()) {
      const pdfBytes = await generateJobPDF(job, session.business);
      await sendReportEmail({ job, business: session.business, pdfBuffer: pdfBytes });
      const completedAt = new Date().toISOString();
      await adminDb.collection("jobs").doc(jobId).update({
        status: "completed",
        completedAt,
        reportSentAt: completedAt,
      });
      await logReportEmailedInteraction(
        session,
        job,
        session.business.id,
        job.customerEmail.trim()
      );
      if (!wasCompleted) {
        await logJobCompletedInteraction(session, job, session.business.id);
      }
      await recordJobChanges(session, job, [
        `Sent the report to ${job.customerEmail.trim()}`,
        ...(!wasCompleted ? ["Marked the job complete"] : []),
      ]);
    } else {
      await adminDb.collection("jobs").doc(jobId).update({
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      if (!wasCompleted) {
        await logJobCompletedInteraction(session, job, session.business.id);
        await recordJobChanges(session, job, ["Marked the job complete"]);
      }
    }

    revalidatePath("/jobs");
    revalidatePath(`/jobs/${jobId}`);
    if (job.customerId) revalidatePath(`/customers/${job.customerId}`);
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

    const job = await loadOwnedJob(jobId, session.business.id);
    if (!job) return { success: false, error: "Job not found." };
    const denied = denyUnlessCanEdit(session, job);
    if (denied) return denied;

    await recordJobChanges(session, job, ["Deleted this job"]);
    await adminDb.collection("jobs").doc(jobId).delete();
    if (job.customerId) {
      await adminDb
        .collection("customers")
        .doc(job.customerId)
        .update({ jobCount: FieldValue.increment(-1) });
    }
    revalidatePath("/jobs");
    if (job.customerId) revalidatePath(`/customers/${job.customerId}`);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete job.";
    return { success: false, error: msg };
  }
}
