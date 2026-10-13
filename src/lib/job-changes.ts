import "server-only";

import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { getJobTechniciansLabel, getJobTitle } from "@/lib/job-utils";
import type {
  ChecklistItem,
  Job,
  JobAssignedTech,
  JobChange,
  JobPhoto,
  SessionContext,
} from "@/types";

type JobUpdate = Partial<
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
>;

function quote(value: string): string {
  const text = value.trim();
  return text ? `“${text}”` : "empty";
}

function textChange(label: string, before: string, after: string): string | null {
  const previous = before.trim();
  const next = after.trim();
  if (previous === next) return null;
  if (!previous) return `Set the ${label} to ${quote(next)}`;
  if (!next) return `Cleared the ${label} (was ${quote(previous)})`;
  return `Changed the ${label} from ${quote(previous)} to ${quote(next)}`;
}

function photoChange(label: string, before: JobPhoto[], after: JobPhoto[]): string | null {
  const beforeUrls = new Set(before.map((photo) => photo.url));
  const afterUrls = new Set(after.map((photo) => photo.url));
  const added = after.filter((photo) => !beforeUrls.has(photo.url)).length;
  const removed = before.filter((photo) => !afterUrls.has(photo.url)).length;
  const parts: string[] = [];
  if (added > 0) parts.push(`added ${added}`);
  if (removed > 0) parts.push(`removed ${removed}`);
  if (parts.length > 0) return `${label} photos: ${parts.join(", ")}`;
  if (JSON.stringify(before) !== JSON.stringify(after)) return `Updated ${label} photo captions`;
  return null;
}

function checklistChange(before: ChecklistItem[], after: ChecklistItem[]): string | null {
  const checked: string[] = [];
  const unchecked: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];

  for (const item of after) {
    const prev = before.find((entry) => entry.item === item.item);
    if (!prev) added.push(item.item);
    else if (prev.checked !== item.checked) {
      (item.checked ? checked : unchecked).push(item.item);
    }
  }
  for (const item of before) {
    if (!after.some((entry) => entry.item === item.item)) removed.push(item.item);
  }

  const parts: string[] = [];
  if (checked.length > 0) parts.push(`Checked ${checked.join(", ")}`);
  if (unchecked.length > 0) parts.push(`Unchecked ${unchecked.join(", ")}`);
  if (added.length > 0) parts.push(`Added checklist item ${added.join(", ")}`);
  if (removed.length > 0) parts.push(`Removed checklist item ${removed.join(", ")}`);
  if (parts.length > 0) return parts.join(". ");
  if (JSON.stringify(before) !== JSON.stringify(after)) return "Updated the checklist";
  return null;
}

function techChange(job: Job, techs: JobAssignedTech[]): string | null {
  const before = getJobTechniciansLabel(job);
  const after = techs.map((tech) => tech.name.trim()).filter(Boolean).join(", ") || "—";
  if (before === after) return null;
  return `Changed technicians from ${before} to ${after}`;
}

/** Lines describing what actually changed. Identical saves produce none. */
export function describeJobUpdates(job: Job, updates: JobUpdate): string[] {
  const lines: string[] = [];

  if (updates.title !== undefined) {
    const line = textChange("job name", getJobTitle(job), updates.title);
    if (line) lines.push(line);
  }
  if (updates.jobAddress !== undefined) {
    const line = textChange("address", job.jobAddress || "", updates.jobAddress);
    if (line) lines.push(line);
  }
  if (updates.notes !== undefined) {
    const line = textChange("notes", job.notes || "", updates.notes);
    if (line) lines.push(line);
  }
  if (updates.customerName !== undefined || updates.customerId !== undefined) {
    const nextName = updates.customerName ?? job.customerName;
    if ((updates.customerId !== undefined && updates.customerId !== job.customerId) || nextName !== job.customerName) {
      const line = textChange("customer", job.customerName || "", nextName || "");
      if (line) lines.push(line);
    }
  }
  if (updates.customerEmail !== undefined) {
    const line = textChange("customer email", job.customerEmail || "", updates.customerEmail);
    if (line) lines.push(line);
  }
  if (updates.customerPhone !== undefined) {
    const line = textChange("customer phone", job.customerPhone || "", updates.customerPhone);
    if (line) lines.push(line);
  }
  if (updates.techs !== undefined) {
    const line = techChange(job, updates.techs);
    if (line) lines.push(line);
  }
  if (updates.checklist !== undefined) {
    const line = checklistChange(job.checklist ?? [], updates.checklist);
    if (line) lines.push(line);
  }
  if (updates.beforePhotos !== undefined) {
    const line = photoChange("Before", job.beforePhotos ?? [], updates.beforePhotos);
    if (line) lines.push(line);
  }
  if (updates.afterPhotos !== undefined) {
    const line = photoChange("After", job.afterPhotos ?? [], updates.afterPhotos);
    if (line) lines.push(line);
  }

  return lines;
}

function actorName(session: SessionContext): string {
  if (session.role === "owner") return session.business?.ownerName || session.user.email || "Owner";
  return session.tech?.name || session.user.email || "Technician";
}

export async function recordJobChanges(
  session: SessionContext,
  job: Pick<Job, "id" | "businessId" | "title" | "jobType">,
  summaries: string[]
): Promise<void> {
  const lines = summaries.map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0 || !session.business) return;

  const createdAt = new Date().toISOString();
  const batch = adminDb.batch();
  for (const summary of lines) {
    const ref = adminDb.collection("jobChanges").doc();
    batch.set(ref, {
      businessId: session.business.id,
      jobId: job.id,
      jobTitle: getJobTitle(job),
      summary,
      createdByUid: session.user.uid,
      createdByName: actorName(session),
      createdAt,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    logger.error("Failed to record job changes", {
      jobId: job.id,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

function mapChange(id: string, data: Record<string, unknown>): JobChange {
  return {
    id,
    businessId: String(data.businessId ?? ""),
    jobId: String(data.jobId ?? ""),
    jobTitle: String(data.jobTitle ?? "Job"),
    summary: String(data.summary ?? ""),
    createdByUid: String(data.createdByUid ?? ""),
    createdByName: String(data.createdByName ?? "Team"),
    createdAt: String(data.createdAt ?? ""),
  };
}

export async function listJobChanges(businessId: string, jobId: string): Promise<JobChange[]> {
  const snap = await adminDb
    .collection("jobChanges")
    .where("jobId", "==", jobId)
    .limit(200)
    .get();

  return snap.docs
    .map((doc) => mapChange(doc.id, doc.data() as Record<string, unknown>))
    .filter((change) => change.businessId === businessId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listRecentJobChanges(businessId: string): Promise<JobChange[]> {
  const snap = await adminDb
    .collection("jobChanges")
    .where("businessId", "==", businessId)
    .limit(200)
    .get();

  return snap.docs
    .map((doc) => mapChange(doc.id, doc.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
